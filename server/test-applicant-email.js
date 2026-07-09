import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  family: 4,     // Force IPv4
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function test() {
  try {
    const applicantMailOptions = {
      from: `"AlgoUniversity" <${process.env.SMTP_USER}>`,
      to: "chandansaraswat16@gmail.com",
      subject: 'Consultation Request Received - AlgoUniversity (Test)',
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #b91c1c;">Thank You for Reaching Out!</h2>
          <p>Hi Chandan,</p>
          <p>This is a test of the applicant email.</p>
        </div>
      `,
    };

    console.log("Sending email...");
    const info = await transporter.sendMail(applicantMailOptions);
    console.log("Success! Message ID:", info.messageId);
    console.log("SMTP Response:", info.response);
  } catch (err) {
    console.error("Error caught:", err);
  }
}
test();
