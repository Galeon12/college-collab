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
 * Why a plain file and not a queue: it lives on the VM's own disk at /var/lib/college-collab,
 * OUTSIDE the git worktree, so it survives process restarts, redeploys, and re-cloning the repo.
 * That is genuinely durable here with zero new infrastructure. It must never be moved inside the
 * checkout: gitignored-and-inside-the-repo is the most deletable state on the box, and one
 * `git clean -xdf` would erase the only copy of every submission Airtable rejected.
 *
 * LIMIT: the single-writer chain below assumes ONE process. Run pm2 in cluster mode, or with
 * instances > 1, and two processes interleave partial lines into the JSONL while reconcileSpool
 * rewrites the file from one process's view of it -- DELETING the other's entries. Silent loss
 * of applicant submissions, inside the machinery built to prevent exactly that. ecosystem.config.cjs
 * pins fork mode with a single instance; do not change it without replacing this with a real queue.
 */

const SPOOL_FILE = path.join(config.SPOOL_DIR, 'failed-writes.jsonl');
const DEAD_LETTER_FILE = path.join(config.SPOOL_DIR, 'dead-letter.jsonl');
const CORRUPT_FILE = path.join(config.SPOOL_DIR, 'corrupt.jsonl');

// Serializes all writes through one promise chain so two concurrent requests can never
// interleave a partial line into the JSONL.
//
// Do NOT call serialize() from inside work already running under serialize(): the inner call
// would await the very chain link it is part of, and deadlock.
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

/**
 * Reads a JSONL file. Runs raw (not under serialize) because callers may already hold the
 * chain -- see reconcileSpool.
 */
async function readJsonl(file) {
  let contents;
  try {
    contents = await fs.readFile(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const entries = [];
  for (const line of contents.split('\n')) {
    if (!line.trim()) continue;

    try {
      entries.push(JSON.parse(line));
    } catch {
      // A torn line cannot be replayed as an entry, but its bytes must not simply vanish on
      // the next rewrite. Quarantine the raw text so the submission is still recoverable.
      console.error(`[spool] unparseable line in ${path.basename(file)}, quarantining to corrupt.jsonl`);
      await fs.appendFile(CORRUPT_FILE, `${line}\n`);
    }
  }

  return entries;
}

export function readSpool() {
  return readJsonl(SPOOL_FILE);
}

/** Write to a temp file then rename, so a crash mid-write cannot truncate the spool. */
async function writeAtomic(file, entries) {
  const body = entries.map((entry) => `${JSON.stringify(entry)}\n`).join('');
  const temp = `${file}.tmp`;
  await fs.writeFile(temp, body);
  await fs.rename(temp, file);
}

/**
 * Applies the outcome of a drain pass.
 *
 * `outcomes` maps entry id -> the updated entry to keep (a retry, with a bumped attempt
 * count), or null to remove it (written to Airtable, or dead-lettered).
 *
 * Critically, this RE-READS the spool inside the serialized section and leaves any id it does
 * not know about untouched. A drain pass takes seconds (network I/O per entry), and a
 * submission can land in the spool while it runs. Rewriting the file from the drainer's stale
 * in-memory snapshot would delete that submission -- silent data loss in the exact machinery
 * built to prevent it.
 */
export async function reconcileSpool(outcomes) {
  await serialize(async () => {
    const current = await readJsonl(SPOOL_FILE);

    const next = [];
    for (const entry of current) {
      if (!outcomes.has(entry.id)) {
        next.push(entry);   // appended while the drain was running; leave it alone
        continue;
      }
      const updated = outcomes.get(entry.id);
      if (updated) next.push(updated);   // still needs retrying
    }

    await writeAtomic(SPOOL_FILE, next);
  });
}

export async function spoolDepth() {
  const entries = await readSpool();
  return entries.length;
}
