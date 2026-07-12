import './setup.js';
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { airtableError, timeoutError } from './setup.js';
import { config } from '../env.js';
import { initSpool, appendToSpool, readSpool } from '../db/spool.js';
import { configureDrainer, drainSpool } from '../db/drain.js';

const SPOOL_FILE = path.join(config.SPOOL_DIR, 'failed-writes.jsonl');
const DEAD_LETTER_FILE = path.join(config.SPOOL_DIR, 'dead-letter.jsonl');

const DRAIN_MAX_ATTEMPTS = 10;   // mirrors MAX_ATTEMPTS in db/drain.js

const deadLetterCount = async () => {
  try {
    return (await fs.readFile(DEAD_LETTER_FILE, 'utf8')).split('\n').filter((l) => l.trim()).length;
  } catch {
    return 0;
  }
};

/** A stand-in for the Airtable driver. The drainer takes its driver by injection for this. */
function fakeStorage({ exists = false, onCreate = () => {} } = {}) {
  const created = [];
  return {
    created,
    findApplicationByEmail: async () => (exists ? { _id: 'recExisting' } : null),
    createApplication: async (payload) => {
      onCreate();
      created.push(payload);
      return { _id: 'recNew', ...payload };
    },
  };
}

beforeEach(async () => {
  await initSpool();
  await Promise.all(
    [SPOOL_FILE, DEAD_LETTER_FILE].map((file) => fs.rm(file, { force: true })),
  );
});

const spool = (email) => appendToSpool({ op: 'createApplication', payload: { name: 'A', email } });

test('a spooled write is created in Airtable and dropped from the spool', async () => {
  const storage = fakeStorage();
  configureDrainer(storage);
  await spool('a@example.com');

  await drainSpool();

  assert.equal(storage.created.length, 1);
  assert.equal(storage.created[0].email, 'a@example.com');
  assert.equal((await readSpool()).length, 0);
});

test('an entry that already landed is dropped, not written twice', async () => {
  // A write can succeed and THEN have its response time out, so the payload gets spooled even
  // though Airtable has it. Without the pre-check the drainer would create a duplicate, and
  // Airtable has no unique constraint to stop it.
  const storage = fakeStorage({ exists: true });
  configureDrainer(storage);
  await spool('already@example.com');

  await drainSpool();

  assert.equal(storage.created.length, 0, 'must not create a duplicate row');
  assert.equal((await readSpool()).length, 0);
});

test('a permanent failure is dead-lettered immediately', async () => {
  const storage = fakeStorage({
    onCreate: () => { throw airtableError(422, 'UNKNOWN_FIELD_NAME'); },
  });
  configureDrainer(storage);
  await spool('a@example.com');

  await drainSpool();

  assert.equal(await deadLetterCount(), 1);
  assert.equal((await readSpool()).length, 0);
});

test('a transient failure stays spooled and increments its attempt count', async () => {
  const storage = fakeStorage({
    onCreate: () => { throw airtableError(503, 'SERVICE_UNAVAILABLE'); },
  });
  configureDrainer(storage);
  await spool('a@example.com');

  await drainSpool();

  const entries = await readSpool();
  assert.equal(entries.length, 1);
  assert.equal(entries[0].attempts, 1);
  assert.equal(entries[0].lastError.statusCode, 503);
  assert.equal(await deadLetterCount(), 0, 'a transient failure must never be dead-lettered');
});

test('a timeout is retried, not dead-lettered', async () => {
  // Regression: a timeout carries no statusCode, and was once classified permanent. That sent
  // a real submission to the dead-letter file the first time Airtable was slow.
  const storage = fakeStorage({ onCreate: () => { throw timeoutError(); } });
  configureDrainer(storage);
  await spool('a@example.com');

  await drainSpool();

  assert.equal((await readSpool()).length, 1);
  assert.equal(await deadLetterCount(), 0);
});

test('an entry is dead-lettered once it exhausts its attempts', async () => {
  const storage = fakeStorage({
    onCreate: () => { throw airtableError(503, 'SERVICE_UNAVAILABLE'); },
  });
  configureDrainer(storage);
  await spool('a@example.com');

  for (let i = 0; i < DRAIN_MAX_ATTEMPTS; i++) await drainSpool();

  assert.equal(await deadLetterCount(), 1);
  assert.equal((await readSpool()).length, 0);
});

test('a submission that arrives mid-drain survives the pass', async () => {
  // The drainer is slow (network I/O per entry). A submission landing during the pass is not
  // in its snapshot, and must not be erased when it writes the spool back.
  let arrived = null;
  const storage = fakeStorage({
    onCreate: () => {
      if (!arrived) arrived = spool('midflight@example.com');
    },
  });
  configureDrainer(storage);
  await spool('drained@example.com');

  await drainSpool();
  await arrived;

  const entries = await readSpool();
  assert.equal(entries.length, 1, 'the mid-drain submission must still be there');
  assert.equal(entries[0].payload.email, 'midflight@example.com');
});

test('a drain failure does not take the process down', async () => {
  configureDrainer({
    findApplicationByEmail: async () => { throw new Error('storage exploded'); },
    createApplication: async () => { throw new Error('storage exploded'); },
  });
  await spool('a@example.com');

  await assert.doesNotReject(() => drainSpool());
});
