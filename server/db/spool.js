import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { config, IS_PRODUCTION } from '../env.js';

/**
 * A durable, append-only fallback for writes that Airtable rejected.
 *
 * This is the whole reason a failed submission is not a lost submission. When an Airtable
 * write exhausts its retry budget, the payload lands in failed-writes.jsonl and a background
 * drainer (./drain.js) keeps trying. Entries that can never succeed go to dead-letter.jsonl
 * for a human.
 *
 * Why a plain file and not a queue: on Azure App Service Linux, /home is a persistent Azure
 * Files mount that survives process restart, container recycle and redeploy. That makes a file
 * genuinely durable here with zero new infrastructure.
 *
 * LIMIT: the single-writer chain below assumes ONE process on ONE instance. Scale App Service
 * past a single instance and this breaks — you would need a real queue instead.
 */

const SPOOL_FILE = path.join(config.SPOOL_DIR, 'failed-writes.jsonl');
const DEAD_LETTER_FILE = path.join(config.SPOOL_DIR, 'dead-letter.jsonl');

// Serializes all writes through one promise chain so two concurrent requests can never
// interleave a partial line into the JSONL.
let writeChain = Promise.resolve();

function serialize(work) {
  const result = writeChain.then(work, work);
  // Keep the chain alive even if this link rejects; the caller still sees the rejection.
  writeChain = result.catch(() => {});
  return result;
}

/**
 * Creates the spool directory and proves it is writable.
 *
 * In production a failed probe FAILS BOOT, deliberately. The no-data-loss guarantee rests
 * entirely on this file being writable; coming up without the safety net is exactly how you
 * lose the submission you were trying to protect.
 */
export async function initSpool() {
  try {
    await fs.mkdir(config.SPOOL_DIR, { recursive: true });
    const probe = path.join(config.SPOOL_DIR, '.probe');
    await fs.writeFile(probe, String(Date.now()));
    await fs.unlink(probe);
    console.log(`[spool] ready at ${config.SPOOL_DIR}`);
  } catch (error) {
    console.error(`[spool] directory is not writable: ${config.SPOOL_DIR}`);
    console.error(`  ${error.message}`);
    if (IS_PRODUCTION) {
      console.error('  Refusing to start: a failed write would be lost with no way to recover it.');
      process.exit(1);
    }
    console.error('  Continuing anyway because this is not production.');
  }
}

export async function appendToSpool({ op, payload }) {
  const entry = {
    id: randomUUID(),
    op,
    payload,
    attempts: 0,
    firstFailedAt: new Date().toISOString(),
    lastError: null,
  };

  await serialize(() => fs.appendFile(SPOOL_FILE, `${JSON.stringify(entry)}\n`));
  return entry;
}

export async function appendToDeadLetter(entry) {
  await serialize(() => fs.appendFile(DEAD_LETTER_FILE, `${JSON.stringify(entry)}\n`));
}

async function readJsonl(file) {
  let contents;
  try {
    contents = await fs.readFile(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  return contents
    .split('\n')
    .filter((line) => line.trim())
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch {
        // A torn line means we lost this record's framing. Say so loudly rather than
        // dropping it silently — the raw text is still in the file for recovery.
        console.error(`[spool] unparseable line ${index + 1} in ${file}, skipping`);
        return null;
      }
    })
    .filter(Boolean);
}

export function readSpool() {
  return readJsonl(SPOOL_FILE);
}

/** Write-temp-then-rename, so a crash mid-write cannot truncate the spool. */
export async function rewriteSpool(entries) {
  const body = entries.map((entry) => `${JSON.stringify(entry)}\n`).join('');
  const temp = `${SPOOL_FILE}.tmp`;

  await serialize(async () => {
    await fs.writeFile(temp, body);
    await fs.rename(temp, SPOOL_FILE);
  });
}

export async function spoolDepth() {
  const entries = await readSpool();
  return entries.length;
}
