import { classifyAirtableError } from './retry.js';
import { readSpool, reconcileSpool, appendToDeadLetter } from './spool.js';

/**
 * Retries spooled writes in the background until they land in Airtable.
 *
 * This is where rate-limit recovery actually happens. The in-request retry budget is
 * deliberately shorter than Airtable's 30s lockout, so a throttled write spools immediately
 * rather than holding the applicant's browser open; the drainer is patient where the request
 * cannot be.
 */

const DRAIN_INTERVAL_MS = 60_000;
const MAX_ATTEMPTS = 10;   // then it needs a human -- see runbooks/spool-recovery.md

// The driver is injected rather than imported so this module doesn't reach around and pick a
// storage backend of its own, and so tests can drain against a fake.
let storage = null;
let isDraining = false;

async function drainEntry(entry) {
  try {
    // An entry can be spooled and yet have actually landed (the write succeeds, then the
    // response times out). Re-checking before create is what stops the drainer producing
    // duplicates -- Airtable has no unique constraint to catch them.
    if (await storage.findApplicationByEmail(entry.payload.email)) {
      console.log(`[drain] ${entry.id} already present in Airtable, dropping`);
      return { outcome: 'done' };
    }

    await storage.createApplication(entry.payload);
    console.log(`[drain] ${entry.id} written to Airtable after ${entry.attempts + 1} attempt(s)`);
    return { outcome: 'done' };
  } catch (error) {
    const attempts = entry.attempts + 1;
    const next = {
      ...entry,
      attempts,
      lastError: {
        type: error?.error ?? null,
        statusCode: error?.statusCode ?? null,
        message: error?.message ?? String(error),
      },
    };

    if (classifyAirtableError(error) === 'permanent') {
      console.error(`[drain] ${entry.id} failed permanently (${error?.error}) -- dead-lettering`);
      return { outcome: 'dead-letter', entry: next };
    }
    if (attempts >= MAX_ATTEMPTS) {
      console.error(`[drain] ${entry.id} exhausted ${attempts} attempts -- dead-lettering`);
      return { outcome: 'dead-letter', entry: next };
    }

    return { outcome: 'retry', entry: next };
  }
}

export async function drainSpool() {
  if (isDraining) return;   // a slow pass must not overlap the next tick
  isDraining = true;

  try {
    if (!storage) return;   // configureDrainer was never called

    const entries = await readSpool();
    if (entries.length === 0) return;

    console.log(`[drain] ${entries.length} spooled write(s) pending`);

    // id -> updated entry to keep, or null to remove. Anything NOT in this map is a write
    // that arrived while this pass was running, and reconcileSpool must leave it alone.
    const outcomes = new Map();
    let retrying = 0;

    for (const entry of entries) {
      const { outcome, entry: updated } = await drainEntry(entry);

      if (outcome === 'retry') {
        outcomes.set(entry.id, updated);
        retrying += 1;
      } else {
        if (outcome === 'dead-letter') await appendToDeadLetter(updated);
        outcomes.set(entry.id, null);
      }
    }

    await reconcileSpool(outcomes);

    if (retrying > 0) {
      console.warn(`[drain] ${retrying} write(s) still pending, will retry`);
    }
  } catch (error) {
    // Never let a drain failure take the process down -- the spool is the safety net, and it
    // failing must not also break the live request path.
    console.error('[drain] pass failed:', error.message);
  } finally {
    isDraining = false;
  }
}

/** Inject the storage driver without starting the interval. Used by tests. */
export function configureDrainer(storageDriver) {
  storage = storageDriver;
}

export function startDrainer(storageDriver) {
  configureDrainer(storageDriver);

  drainSpool();   // catch anything left behind by a previous process
  setInterval(drainSpool, DRAIN_INTERVAL_MS).unref();   // don't hold the event loop open
  console.log(`[drain] running every ${DRAIN_INTERVAL_MS}ms`);
}
