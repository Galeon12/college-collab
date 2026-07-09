import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
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

// Removed test-email route as we are moving to EmailJS

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong on the server!' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
