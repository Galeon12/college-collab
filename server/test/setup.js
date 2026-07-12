/**
 * Must be the FIRST import in every test file.
 *
 * env.js validates the environment at module load and calls process.exit(1) if anything is
 * missing, so these values have to exist before any module that imports it is evaluated. ES
 * module imports are hoisted and evaluated in source order, which is what makes importing this
 * file first work.
 */
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'test-jwt-secret';
process.env.RECAPTCHA_SECRET ||= 'test-recaptcha-secret';
process.env.ADMIN_API_KEY ||= 'test-admin-key';
process.env.AUTH0_DOMAIN ||= 'test.us.auth0.com';
process.env.AIRTABLE_PAT ||= 'patTEST';
process.env.AIRTABLE_BASE_ID ||= 'appTEST';

// A fresh spool directory per test process, so files from one suite cannot leak into another.
// `node --test` runs each file in its own process, so this is per-file isolation.
process.env.SPOOL_DIR ||= mkdtempSync(path.join(os.tmpdir(), 'college-collab-test-'));

/** Builds an error shaped like the ones the Airtable SDK rejects with. */
export function airtableError(statusCode, code) {
  return Object.assign(new Error(code), { statusCode, error: code });
}

/**
 * The SDK does NOT wrap request timeouts into its documented CONNECTION_ERROR shape on the
 * select/create path. A timeout arrives as a bare AbortError with no statusCode at all, which
 * is exactly the case that used to be misclassified as permanent.
 */
export function timeoutError() {
  return Object.assign(new Error('The user aborted a request.'), { name: 'AbortError' });
}
