/**
 * Request validation.
 *
 * Airtable enforces NOTHING: no types, no lengths, no formats, no uniqueness. The Mongoose
 * schemas that used to do this (required, trim, lowercase, an email regex, maxlength) were
 * deleted in the migration and nothing replaced them, so until now the only checks were
 * presence. These functions put that back.
 *
 * Each returns an error string, or null when the input is acceptable.
 */

// Deliberately permissive. The goal is to reject obvious junk before it reaches Airtable,
// not to adjudicate RFC 5322 -- an over-clever regex rejects real addresses.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const MAX = {
  name: 200,
  college: 200,
  email: 320,          // RFC 5321 maximum
  phone: 32,
  message: 5_000,
  institution: 200,
  designation: 120,
};

const MIN_PASSWORD = 8;

// bcrypt silently ignores everything past 72 BYTES. Accepting a longer password would mean
// only its first 72 bytes ever get checked, which is not what the user is told is happening.
const MAX_PASSWORD_BYTES = 72;

function checkText(value, field, max, { required = true } = {}) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return required ? `${field} is required.` : null;
  }
  if (typeof value !== 'string') {
    return `${field} must be text.`;
  }
  if (value.length > max) {
    return `${field} must be ${max} characters or fewer.`;
  }
  return null;
}

function checkEmail(value) {
  const problem = checkText(value, 'Email', MAX.email);
  if (problem) return problem;
  if (!EMAIL_PATTERN.test(value.trim())) return 'Please provide a valid email address.';
  return null;
}

function checkPassword(value) {
  if (typeof value !== 'string' || value === '') return 'Password is required.';
  if (value.length < MIN_PASSWORD) {
    return `Password must be at least ${MIN_PASSWORD} characters.`;
  }
  if (Buffer.byteLength(value, 'utf8') > MAX_PASSWORD_BYTES) {
    return `Password must be ${MAX_PASSWORD_BYTES} bytes or fewer.`;
  }
  return null;
}

export function validateApplication(body) {
  return checkText(body.name, 'Name', MAX.name)
    || checkText(body.college, 'College', MAX.college)
    || checkEmail(body.email)
    || checkText(body.phone, 'Phone', MAX.phone, { required: false })
    || checkText(body.message, 'Message', MAX.message, { required: false });
}

export function validateSignup(body) {
  return checkText(body.fullName, 'Full name', MAX.name)
    || checkEmail(body.email)
    || checkText(body.phone, 'Phone', MAX.phone)
    || checkText(body.institution, 'Institution', MAX.institution)
    || checkText(body.designation, 'Designation', MAX.designation)
    || checkPassword(body.password);
}

/** Google sign-in supplies name and email itself; only the extra profile fields need checking. */
export function validateGoogleProfile(body) {
  return checkText(body.phone, 'Phone', MAX.phone)
    || checkText(body.institution, 'Institution', MAX.institution)
    || checkText(body.designation, 'Designation', MAX.designation);
}
