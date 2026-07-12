import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { airtableError, timeoutError } from './setup.js';
import { classifyAirtableError, withRetry } from '../db/retry.js';

/**
 * The polarity of this classifier is the single most dangerous thing in the write path.
 *
 * Call a transient failure "permanent" and the drainer dead-letters a real applicant's
 * submission on a network blip. Call a permanent failure "transient" and we waste a few
 * retries before dead-lettering it anyway. Only one of those loses data, so anything we do
 * not explicitly recognise must be retryable.
 */
test('classify: Airtable explicitly rejected it -> permanent', () => {
  for (const status of [400, 401, 403, 404, 413, 422]) {
    assert.equal(
      classifyAirtableError(airtableError(status, 'REJECTED')),
      'permanent',
      `${status} should be permanent`,
    );
  }
});

test('classify: throttling and server faults -> retryable', () => {
  for (const status of [429, 500, 502, 503, 504]) {
    assert.equal(
      classifyAirtableError(airtableError(status, 'TRANSIENT')),
      'retryable',
      `${status} should be retryable`,
    );
  }
});

test('classify: a request timeout is retryable, NOT permanent', () => {
  // Regression. A timeout has no .statusCode and no .error, so a classifier keyed on an
  // allowlist of retryable codes silently marks every timeout permanent and dead-letters it.
  const error = timeoutError();
  assert.equal(error.statusCode, undefined);
  assert.equal(error.error, undefined);
  assert.equal(classifyAirtableError(error), 'retryable');
});

test('classify: unrecognised errors default to retryable', () => {
  assert.equal(classifyAirtableError(new Error('who knows')), 'retryable');
  assert.equal(classifyAirtableError(undefined), 'retryable');
});

test('withRetry: returns the value once the call succeeds', async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls += 1;
    if (calls < 3) throw airtableError(503, 'SERVICE_UNAVAILABLE');
    return 'ok';
  }, { baseDelayMs: 1 });

  assert.equal(result, 'ok');
  assert.equal(calls, 3);
});

test('withRetry: a permanent error fails fast, with no retries', async () => {
  let calls = 0;
  await assert.rejects(
    () => withRetry(async () => {
      calls += 1;
      throw airtableError(422, 'UNKNOWN_FIELD_NAME');
    }, { baseDelayMs: 1 }),
    { statusCode: 422 },
  );

  assert.equal(calls, 1, 'a schema mismatch must not be retried');
});

test('withRetry: gives up after maxAttempts', async () => {
  let calls = 0;
  await assert.rejects(() => withRetry(async () => {
    calls += 1;
    throw airtableError(503, 'SERVICE_UNAVAILABLE');
  }, { maxAttempts: 3, baseDelayMs: 1 }));

  assert.equal(calls, 3);
});

test('withRetry: stops when the wall-clock budget is spent', async () => {
  let calls = 0;
  const startedAt = Date.now();

  await assert.rejects(() => withRetry(async () => {
    calls += 1;
    throw airtableError(429, 'TOO_MANY_REQUESTS');
  }, { maxAttempts: 50, budgetMs: 150, baseDelayMs: 40 }));

  // The budget, not the attempt count, is what ended it. This is what stops a throttled write
  // from holding an applicant's browser open for Airtable's full 30 second lockout.
  assert.ok(calls < 50, `expected the budget to cut it short, got ${calls} attempts`);
  assert.ok(Date.now() - startedAt < 2_000);
});
