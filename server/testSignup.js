import fetch from 'node-fetch'; // wait, fetch is built-in in node 18+

async function testSignup() {
  try {
    const start = Date.now();
    const res = await fetch('http://localhost:5000/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fullName: 'Test User API',
        email: 'api' + Date.now() + '@example.com',
        phone: '123456789',
        isWhatsapp: false,
        institution: 'Testing',
        designation: 'Tester',
        password: 'password123',
        captchaToken: 'dummy-token'
      })
    });
    
    const data = await res.json();
    console.log(`Response in ${Date.now() - start}ms:`, data);
  } catch (error) {
    console.error('Fetch error:', error);
  }
}
testSignup();
