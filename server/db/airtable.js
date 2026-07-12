import Airtable from 'airtable';
import { config } from '../env.js';
import { withRetry } from './retry.js';

const base = new Airtable({
  apiKey: process.env.AIRTABLE_PAT,
  // The SDK defaults to 300s. That is not a timeout, it's a hang.
  requestTimeout: config.AIRTABLE_TIMEOUT_MS,
  // The SDK retries 429 with no attempt ceiling, backing off toward 10 minutes. We do our
  // own bounded retry in ./retry.js -- leaving this off would hang requests indefinitely.
  noRetryIfRateLimited: true,
}).base(process.env.AIRTABLE_BASE_ID);

const USERS_TABLE = process.env.AIRTABLE_TABLE_USERS || 'Users';
const APPS_TABLE = process.env.AIRTABLE_TABLE_APPLICATIONS || 'Applications';

/**
 * Airtable matches field names literally and case-sensitively -- a mismatch is a 422, which we
 * classify as permanent and dead-letter. The literals written below are the contract with the
 * base; renaming a column in the Airtable UI without changing them here breaks writes.
 *
 * Watch the casing: the Users table uses `isWhatsapp` with a LOWERCASE 'a'.
 */

/**
 * Escapes a value interpolated into a filterByFormula string literal.
 *
 * Backslashes must be escaped FIRST. Escaping quotes first would turn an input backslash into
 * the escape character for the quote we just added, letting the value break out of the literal.
 */
function escapeFormulaValue(value) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** Airtable record -> the `{ _id, ...fields }` shape the routes expect (a Mongoose leftover). */
function toRecord(record) {
  return { _id: record.id, ...record.fields };
}

/** Both tables key on a field named `email`. */
async function findByEmail(table, email) {
  const safeEmail = escapeFormulaValue(email.toLowerCase());
  const records = await withRetry(
    () => base(table).select({
      filterByFormula: `{email} = '${safeEmail}'`,
      maxRecords: 1,
    }).firstPage(),
    { label: `findByEmail(${table})` },
  );

  return records.length === 0 ? null : records[0];
}

// ==========================================
// USERS
// ==========================================

/**
 * Never returns the password hash -- the Airtable record carries it, and spreading the raw
 * fields is how it would end up on the wire. Login reads it via findUserCredentialsByEmail.
 */
export const findUserByEmail = async (email) => {
  const record = await findByEmail(USERS_TABLE, email);
  if (!record) return null;

  const { password: _password, ...safeFields } = record.fields;
  return { _id: record.id, ...safeFields };
};

/**
 * The only way to get the password hash -- and it hands it back under an explicit
 * `passwordHash` key rather than smuggling it inside the spread fields, so no caller
 * can leak it by accident. Used solely by POST /api/auth/login.
 */
export const findUserCredentialsByEmail = async (email) => {
  const record = await findByEmail(USERS_TABLE, email);
  if (!record) return null;

  const { password: passwordHash, ...safeFields } = record.fields;
  return { _id: record.id, ...safeFields, passwordHash };
};

export const createUser = async (userData) => {
  const records = await withRetry(
    () => base(USERS_TABLE).create([{
      fields: {
        fullName: userData.fullName,
        email: userData.email.toLowerCase(),
        phone: userData.phone,
        isWhatsapp: userData.isWhatsapp || false,   // lowercase 'a' -- see airtable-schema.md
        institution: userData.institution,
        designation: userData.designation,
        password: userData.password,
      },
    }]),
    { label: 'createUser' },
  );

  const { password: _password, ...safeFields } = records[0].fields;
  return { _id: records[0].id, ...safeFields };
};

// ==========================================
// APPLICATIONS
// ==========================================

export const findApplicationByEmail = async (email) => {
  const record = await findByEmail(APPS_TABLE, email);
  return record ? toRecord(record) : null;
};

export const createApplication = async (appData) => {
  const records = await withRetry(
    () => base(APPS_TABLE).create([{
      fields: {
        name: appData.name,
        college: appData.college,
        email: appData.email.toLowerCase(),
        phone: appData.phone || '',
        message: appData.message || '',
      },
    }]),
    { label: 'createApplication' },
  );

  return toRecord(records[0]);
};

/**
 * Sorted newest-first in JS, NOT via Airtable's `sort` option. The original implementation
 * sorted on a literal field named 'Created time', which throws UNKNOWN_FIELD_NAME on any base
 * that lacks that exact column. `createdTime` is returned by Airtable on every record and
 * needs no column at all. Do not reintroduce the sort.
 */
export const getAllApplications = async () => {
  const records = await withRetry(
    () => base(APPS_TABLE).select().all(),
    { label: 'getAllApplications' },
  );

  return records
    .map((record) => ({
      ...toRecord(record),
      createdAt: record._rawJson.createdTime,
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export default {
  findUserByEmail,
  findUserCredentialsByEmail,
  createUser,
  findApplicationByEmail,
  createApplication,
  getAllApplications,
};
