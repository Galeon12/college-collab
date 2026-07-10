const data = {
  service_id: 'service_xscu7fj',
  template_id: 'template_1wuq1co',
  user_id: 'dhRhCGX-5n40gso7y',
  template_params: {
    from_name: 'Test Agent',
    reply_to: 'test@example.com',
    college: 'Test College',
    phone: '1234567890',
    message: 'This is a diagnostic test of the EmailJS configuration.'
  }
};

fetch('https://api.emailjs.com/api/v1.0/email/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
})
.then(async (response) => {
  if (response.ok) {
    console.log("EmailJS Success! The email was sent to your inbox.");
  } else {
    const text = await response.text();
    console.error("EmailJS Error:", response.status, text);
  }
})
.catch(error => {
  console.error("Fetch Error:", error);
});
