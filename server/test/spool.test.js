import './setup.js';
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../env.js';
import {
  initSpool,
  appendToSpool,
  appendToDeadLetter,
  readSpool,
  reconcileSpool,
  spoolDepth,
} from '../db/spool.js';

const SPOOL_FILE = path.join(config.SPOOL_DIR, 'failed-writes.jsonl');
const DEAD_LETTER_FILE = path.join(config.SPOOL_DIR, 'dead-letter.jsonl');
const CORRUPT_FILE = path.join(config.SPOOL_DIR, 'corrupt.jsonl');

const readLines = async (file) => {
  try {
    return (await fs.readFile(file, 'utf8')).split('\n').filter((line) => line.trim());
  } catch {
    return [];
  }
};

beforeEach(async () => {
  await initSpool();
  await Promise.all(
    [SPOOL_FILE, DEAD_LETTER_FILE, CORRUPT_FILE].map((file) => fs.rm(file, { force: true })),
  );
});

const application = (email) => ({ op: 'createApplication', payload: { name: 'A', email } });

test('a spooled write can be read back', async () => {
  const entry = await appendToSpool(application('a@example.com'));

  const entries = await readSpool();
  assert.equal(entries.length, 1);
  assert.equal(entries[0].id, entry.id);
  assert.equal(entries[0].payload.email, 'a@example.com');
  assert.equal(entries[0].attempts, 0);
  assert.equal(await spoolDepth(), 1);
});

test('concurrent appends do not interleave into a torn line', async () => {
  await Promise.all(
    Array.from({ length: 25 }, (_, i) => appendToSpool(application(`user${i}@example.com`))),
  );

  // Every line must be independently parseable. A partial write would show up as a JSON error.
  const lines = await readLines(SPOOL_FILE);
  assert.equal(lines.length, 25);
  for (const line of lines) assert.doesNotThrow(() => JSON.parse(line));
  assert.equal((await readSpool()).length, 25);
});

test('reconcile removes the entries it processed', async () => {
  const a = await appendToSpool(application('a@example.com'));
  const b = await appendToSpool(application('b@example.com'));

  await reconcileSpool(new Map([[a.id, null]]));   // a landed in Airtable, b did not

  const entries = await readSpool();
  assert.equal(entries.length, 1);
  assert.equal(entries[0].id, b.id);
});

test('reconcile keeps entries it was asked to retry, with the updated attempt count', async () => {
  const entry = await appendToSpool(application('a@example.com'));

  await reconcileSpool(new Map([[entry.id, { ...entry, attempts: 4 }]]));

  const entries = await readSpool();
  assert.equal(entries.length, 1);
  assert.equal(entries[0].attempts, 4);
});

/**
 * REGRESSION. A drain pass reads the spool, then spends seconds on network I/O, then writes
 * the file back. A submission that arrives during that window is in the file but NOT in the
 * drainer's snapshot -- so rewriting the file from that snapshot silently deleted it.
 *
 * Data loss, in the exact machinery whose only job is to prevent data loss. reconcileSpool
 * re-reads inside the lock and only touches the ids it was actually given.
 */
test('a write that arrives mid-drain is not clobbered by the reconcile', async () => {
  const beingDrained = await appendToSpool(application('drained@example.com'));

  const snapshot = await readSpool();                       // the drain pass reads...
  const arrivedMidDrain = await appendToSpool(application('midflight@example.com'));   // ...a request lands...

  const outcomes = new Map(snapshot.map((entry) => [entry.id, null]));
  await reconcileSpool(outcomes);                           // ...the drain writes back

  const entries = await readSpool();
  assert.equal(entries.length, 1, 'the mid-drain submission must survive');
  assert.equal(entries[0].id, arrivedMidDrain.id);
  assert.equal(entries[0].payload.email, 'midflight@example.com');
  assert.ok(!entries.some((entry) => entry.id === beingDrained.id));
});

test('dead-lettered entries go to their own file and leave the spool alone', async () => {
  const entry = await appendToSpool(application('a@example.com'));

  await appendToDeadLetter({ ...entry, attempts: 10 });
  await reconcileSpool(new Map([[entry.id, null]]));

  assert.equal((await readLines(DEAD_LETTER_FILE)).length, 1);
  assert.equal((await readSpool()).length, 0);
});

test('an unparseable line is quarantined, not silently dropped', async () => {
  const entry = await appendToSpool(application('a@example.com'));
  await fs.appendFile(SPOOL_FILE, '{"id":"torn","payload":{"em\n');   // a half-written line

  const entries = await readSpool();

  // The good entry still reads, and the torn bytes are preserved for recovery rather than
  // being erased by the next rewrite.
  assert.equal(entries.length, 1);
  assert.equal(entries[0].id, entry.id);
  assert.equal((await readLines(CORRUPT_FILE)).length, 1);
});

test('reading a spool that does not exist yet is empty, not an error', async () => {
  await fs.rm(SPOOL_FILE, { force: true });
  assert.deepEqual(await readSpool(), []);
  assert.equal(await spoolDepth(), 0);
});
