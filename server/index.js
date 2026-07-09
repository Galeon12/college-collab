import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import Application from './models/Application.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (/^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
      return callback(null, true);
    }
    if (origin.endsWith('vercel.app')) {
      return callback(null, true);
    }
    // You can add your custom domain here later
    // if (origin === 'https://yourcustomdomain.com') return callback(null, true);
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('FATAL ERROR: MONGODB_URI is not defined in environment variables.');
  process.exit(1);
}

console.log('Connecting to MongoDB Atlas...');
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB Atlas!');
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB Atlas:', err.message);
    console.log('TIP: Check if your current IP Address is whitelisted in MongoDB Atlas Network Access settings.');
  });

// Routes
app.get('/', (req, res) => {
  res.send('AlgoUniversity Campus Training Programme API is running...');
});

// Nodemailer Setup
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  family: 4,     // Force IPv4, as Render's IPv6 outbound is failing (ENETUNREACH)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmails = async (name, email, college, phone, message) => {
  try {
    // 1. Email to the applicant
    const applicantMailOptions = {
      from: `"AlgoUniversity" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Consultation Request Received - AlgoUniversity',
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #b91c1c;">Thank You for Reaching Out!</h2>
          <p>Hi ${name},</p>
          <p>We have successfully received your consultation request for the <strong>AlgoUniversity Campus Training Programme</strong>.</p>
          <p>Our team is currently reviewing your details and will get back to you shortly to discuss how we can integrate our curriculum seamlessly into your college.</p>
          <p>In the meantime, feel free to reply to this email if you have any immediate questions.</p>
          <br />
          <p>Best regards,</p>
          <p><strong>The AlgoUniversity Team</strong></p>
        </div>
      `,
    };

    // 2. Email to the admin
    const adminMailOptions = {
      from: `"College Collab Portal" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      subject: `New Application Received: ${name} from ${college}`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #b91c1c;">New Application Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>College:</strong> ${college}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
          <p><strong>Message:</strong></p>
          <blockquote style="border-left: 4px solid #eaeaea; padding-left: 10px; color: #555;">
            ${message || 'No message provided.'}
          </blockquote>
        </div>
      `,
    };

    // Send both emails concurrently
    await Promise.all([
      transporter.sendMail(applicantMailOptions),
      transporter.sendMail(adminMailOptions)
    ]);
    
    console.log(`Welcome email sent to ${email} and notification sent to admin`);
  } catch (error) {
    console.error('Error sending emails:', error);
  }
};

// Submit Application
app.post('/api/applications', async (req, res) => {
  try {
    const { name, college, email, phone, message } = req.body;

    // Basic validation
    if (!name || !college || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, college, and email are required fields.' 
      });
    }

    // Check if an application with this email already exists
    const existingApplication = await Application.findOne({ email: email.toLowerCase() });
    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'An application with this email address has already been submitted.'
      });
    }

    const newApplication = new Application({
      name,
      college,
      email,
      phone,
      message,
    });

    await newApplication.save();
    
    console.log(`Saved new application: ${name} (${college})`);
    
    // Send welcome email and admin notification (fire and forget)
    sendEmails(name, email, college, phone, message);
    
    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully!',
      data: newApplication
    });
  } catch (error) {
    console.error('Error saving application:', error);
    
    // Mongoose Validation Error
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    
    // Mongoose Duplicate Key Error (fallback for race conditions)
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'An application with this email address has already been submitted.' });
    }

    return res.status(500).json({
      success: false,
      message: 'An error occurred while saving the application. Please try again.'
    });
  }
});

// Get all applications (Helper route for admin/developer check)
app.get('/api/applications', async (req, res) => {
  try {
    const applications = await Application.find().sort({ createdAt: -1 });
    return res.json({ success: true, count: applications.length, data: applications });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// Diagnostic route to test SMTP credentials and show the exact error in the browser
app.get('/api/test-email', async (req, res) => {
  try {
    const testMailOptions = {
      from: `"Test Server" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      subject: 'Diagnostic SMTP Test',
      text: 'If you receive this, the Render server can successfully send emails.',
    };
    
    await transporter.sendMail(testMailOptions);
    return res.json({ 
      success: true, 
      message: 'Test email successfully sent to ' + process.env.SMTP_USER,
      credentials: {
        user_configured: !!process.env.SMTP_USER,
        pass_configured: !!process.env.SMTP_PASS
      }
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to send email. See error object for details.',
      error: error.message,
      credentials: {
        user_configured: !!process.env.SMTP_USER,
        pass_configured: !!process.env.SMTP_PASS
      }
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong on the server!' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
