import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: undefined,
    pass: undefined,
  },
});

async function test() {
  try {
    await transporter.sendMail({
      from: 'test@example.com',
      to: 'test2@example.com',
      subject: 'test',
      text: 'test'
    });
    console.log("Success");
  } catch (err) {
    console.error("Error caught:", err.message);
  }
}
test();
