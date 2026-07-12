/**
 * The Airtable SDK's own retry is disarmed (noRetryIfRateLimited in airtable.js), because
 * it retries 429 with NO attempt ceiling and a backoff ramping to 10 minutes — a throttled
 * write would hang the request rather than fail. It also retries *only* 429: 5xx, network
 * faults and its own timeout are rejected on the first try. So we own retry entirely.
 */

/**
 * Statuses where a retry provably cannot help: the request itself is wrong.
 * 422 covers UNKNOWN_FIELD_NAME / INVALID_VALUE_FOR_COLUMN — retrying a schema mismatch just
 * burns the rate limit before failing identically. 401/403 are bad credentials; 404 is a bad
 * base or table name.
 *
 * Note 429 and 5xx are deliberately NOT here: those are transient and worth retrying.
 */
const PERMANENT_STATUS = new Set([400, 401, 403, 404, 413, 422]);

/**
 * Only an error Airtable explicitly rejected is permanent. Everything else — a timeout, a
 * dropped connection, a DNS failure, an error shape we've never seen — is treated as transient.
 *
 * The polarity matters and is not arbitrary. Misjudging a transient failure as permanent sends
 * a real applicant's submission straight to the dead-letter file; misjudging a permanent failure
 * as transient costs a few wasted retries and then dead-letters it anyway. Only one of those
 * loses data, so the default is retry.
 *
 * Concretely: the SDK's `.select()`/`.create()` path does NOT wrap aborts into its documented
 * `CONNECTION_ERROR` shape (that only happens on `makeRequest`). A request timeout escapes as a
 * bare node-fetch AbortError with no `.error` and no `.statusCode` at all. Keying off an error
 * code allowlist would silently classify every timeout as permanent.
 */
export function classifyAirtableError(error) {
  const status = error?.statusCode;
  if (typeof status === 'number' && PERMANENT_STATUS.has(status)) return 'permanent';
  return 'retryable';
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const MAX_ATTEMPTS = 3;

// Deliberately SHORTER than Airtable's 30s rate-limit lockout: a throttled write should spool
// and let the drainer handle it, not hold the applicant's browser open for half a minute.
const RETRY_BUDGET_MS = 8_000;

/**
 * Retries `fn` on transient Airtable failures with full-jitter exponential backoff.
 *
 * Bounded twice over: by attempt count and by a wall-clock budget. The budget check happens
 * *before* sleeping, so we never begin a backoff we don't have time to finish — an important
 * property when the caller is an HTTP request an applicant is waiting on.
 *
 * A throttled write is EXPECTED to exhaust the budget and throw, so the caller can spool it.
 */
export async function withRetry(fn, {
  maxAttempts = MAX_ATTEMPTS,
  budgetMs = RETRY_BUDGET_MS,
  baseDelayMs = 500,
  maxDelayMs = 4_000,
  label = 'airtable',
} = {}) {
  const deadline = Date.now() + budgetMs;

  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt >= maxAttempts - 1;
      if (classifyAirtableError(error) === 'permanent' || isLastAttempt) throw error;

      // Full jitter: random between 0 and the capped exponential delay.
      const ceiling = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      const delay = Math.random() * ceiling;

      if (Date.now() + delay >= deadline) throw error;

      // A timed-out request has no .error and no .statusCode, only a name — so fall through
      // to it, otherwise every timeout logs as "unknown" and the cause is invisible.
      const cause = error?.error || error?.statusCode || error?.name || 'unknown';
      console.warn(
        `[retry] ${label} attempt ${attempt + 1}/${maxAttempts} failed `
        + `(${cause}), retrying in ${Math.round(delay)}ms`
      );
      await sleep(delay);
    }
  }
}
