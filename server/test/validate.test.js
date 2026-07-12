import test from 'node:test';
import assert from 'node:assert/strict';
import { validateApplication, validateSignup } from '../validate.js';

const application = (overrides = {}) => ({
  name: 'Asha Rao',
  college: 'NIT Trichy',
  email: 'asha@example.com',
  phone: '+919999900000',
  message: 'Interested',
  ...overrides,
});

const signup = (overrides = {}) => ({
  fullName: 'Asha Rao',
  email: 'asha@example.com',
  phone: '+919999900000',
  institution: 'NIT Trichy',
  designation: 'Placement Officer',
  password: 'correct-horse',
  ...overrides,
});

test('a well-formed application passes', () => {
  assert.equal(validateApplication(application()), null);
});

test('phone and message are optional on an application', () => {
  assert.equal(validateApplication(application({ phone: undefined, message: undefined })), null);
});

test('name, college and email are required', () => {
  assert.match(validateApplication(application({ name: '' })), /Name/);
  assert.match(validateApplication(application({ college: undefined })), /College/);
  assert.match(validateApplication(application({ email: '   ' })), /Email/);
});

test('a malformed email is rejected', () => {
  // Airtable enforces no formats at all, so this is the only thing standing between a typo
  // and a record we can never contact.
  for (const email of ['not-an-email', 'missing@tld', 'a b@example.com', '@example.com']) {
    assert.match(validateApplication(application({ email })), /valid email/, email);
  }
});

test('over-long fields are rejected rather than sent to Airtable', () => {
  assert.match(validateApplication(application({ name: 'a'.repeat(201) })), /200 characters/);
  assert.match(validateApplication(application({ message: 'a'.repeat(5001) })), /5000 characters/);
});

test('a well-formed signup passes', () => {
  assert.equal(validateSignup(signup()), null);
});

test('a short password is rejected', () => {
  assert.match(validateSignup(signup({ password: 'short' })), /at least 8/);
});

test('a password longer than bcrypt can see is rejected', () => {
  // bcrypt silently ignores everything past 72 bytes. Accepting a 100 character password
  // would mean only its first 72 bytes are ever actually checked.
  assert.match(validateSignup(signup({ password: 'a'.repeat(73) })), /72 bytes/);
  assert.equal(validateSignup(signup({ password: 'a'.repeat(72) })), null);
});

test('every signup field is required', () => {
  for (const field of ['fullName', 'email', 'phone', 'institution', 'designation', 'password']) {
    assert.notEqual(validateSignup(signup({ [field]: '' })), null, `${field} should be required`);
  }
});
