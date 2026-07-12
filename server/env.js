import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Every one of these has a security-relevant effect, so booting without them is
// worse than not booting at all. This module must be imported before any module
// that reads process.env at load time (notably ./db/airtable.js), so that a
// missing value reports the full list rather than whichever dependency throws first.
const REQUIRED_ENV = [
  'JWT_SECRET',
  'RECAPTCHA_SECRET',
  'ADMIN_API_KEY',
  'AUTH0_DOMAIN',
  'AIRTABLE_PAT',
  'AIRTABLE_BASE_ID',
  ...(IS_PRODUCTION ? ['ALLOWED_ORIGINS'] : []),
];

const errors = [];

const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
for (const key of missing) errors.push(`${key} is required but not set`);

function parseIntEnv(key, fallback, { min, max }) {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;

  const value = Number(raw);
  if (!Number.isInteger(value)) {
    errors.push(`${key} must be an integer, got "${raw}"`);
    return fallback;
  }
  if (value < min || value > max) {
    errors.push(`${key} must be between ${min} and ${max}, got ${value}`);
    return fallback;
  }
  return value;
}

/**
 * Only two knobs are environment-dependent. Everything else about the retry and spool
 * behaviour is a constant living next to the code that uses it -- a value nobody would ever
 * set in anger is not configuration, it is a constant with extra steps and one more way to
 * misconfigure production.
 */
export const config = Object.freeze({
  // The Airtable SDK's own default is 300s, which is not a timeout but a hang. Worth keeping
  // adjustable: it is the knob to reach for if Airtable slows down, and setting it to 1 is how
  // the tests inject a transient failure.
  AIRTABLE_TIMEOUT_MS: parseIntEnv('AIRTABLE_TIMEOUT_MS', 10_000, { min: 1, max: 120_000 }),

  // Where failed writes are parked until they land in Airtable. /home is a persistent Azure
  // Files mount on App Service Linux; /home/site/wwwroot may be read-only under run-from-package,
  // but /home/data is always writable and survives restarts.
  SPOOL_DIR: process.env.SPOOL_DIR
    || (IS_PRODUCTION ? '/home/data/college-collab' : path.join(SERVER_DIR, '.data')),
});

if (errors.length > 0) {
  console.error('Invalid environment configuration:');
  for (const error of errors) console.error(`  - ${error}`);
  console.error('\nSee server/.env.example.');
  process.exit(1);
}

export const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
