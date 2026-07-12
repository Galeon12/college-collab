import airtableDb from './db/airtable.js';

async function testSignupTrue() {
  try {
    const start = Date.now();
    const user = await airtableDb.createUser({
      fullName: 'Test User API True',
      email: 'apitru' + Date.now() + '@example.com',
      phone: '123456789',
      isWhatsApp: true, // Note the capital A!
      institution: 'Testing',
      designation: 'Tester',
      password: 'password123',
      captchaToken: 'dummy-token'
    });
    console.log(`Success in ${Date.now() - start}ms:`, user.email);
  } catch (e) {
    console.error('Failed:', e);
  }
}
testSignupTrue();
