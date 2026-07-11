import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Application from './models/Application.js';
import User from './models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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

// Authentication Middleware
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization token required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// Submit Application
app.post('/api/applications', requireAuth, async (req, res) => {
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

// --- Auth Routes ---
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { fullName, email, phone, isWhatsapp, institution, designation, password, captchaToken } = req.body;

    if (!fullName || !email || !password || !phone || !institution || !designation) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    if (!captchaToken) {
      return res.status(400).json({ success: false, message: 'reCAPTCHA verification failed. Please try again.' });
    }

    // Verify reCAPTCHA token with Google
    const recaptchaSecret = process.env.RECAPTCHA_SECRET || '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${captchaToken}`;
    
    const recaptchaRes = await fetch(verifyUrl, { method: 'POST' });
    const recaptchaData = await recaptchaRes.json();
    
    if (!recaptchaData.success) {
      return res.status(400).json({ success: false, message: 'reCAPTCHA verification failed.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email: email.toLowerCase(),
      phone,
      isWhatsapp,
      institution,
      designation,
      password: hashedPassword
    });

    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      token,
      user: { id: newUser._id, name: newUser.fullName, email: newUser.email }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.fullName, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// Auth0 JWKS setup for Google verification
import jwksClient from 'jwks-rsa';
const client = jwksClient({
  jwksUri: `https://dev-7bxpsukdfilcicqi.us.auth0.com/.well-known/jwks.json`
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function(err, key) {
    if (err) return callback(err, null);
    var signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

app.post('/api/auth/google', async (req, res) => {
  try {
    const { idToken, phone, institution, designation, isWhatsapp } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'ID token is required.' });
    }

    // Verify Auth0 JWT
    jwt.verify(idToken, getKey, { algorithms: ['RS256'] }, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ success: false, message: 'Invalid Google token.' });
      }

      const email = decoded.email;
      const name = decoded.name;

      if (!email) {
        return res.status(400).json({ success: false, message: 'Email not provided by Google.' });
      }

      let user = await User.findOne({ email: email.toLowerCase() });

      // If user exists, log them in
      if (user) {
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
        return res.json({
          success: true,
          token,
          user: { id: user._id, name: user.fullName, email: user.email }
        });
      }

      // If user doesn't exist and required fields are missing, return flag
      if (!phone || !institution || !designation) {
        return res.json({ 
          success: false, 
          requiresExtraFields: true, 
          email: email.toLowerCase(),
          name 
        });
      }

      // Create new user via Google (generate random password since they use Google)
      const randomPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);

      user = new User({
        fullName: name,
        email: email.toLowerCase(),
        phone,
        isWhatsapp: !!isWhatsapp,
        institution,
        designation,
        password: hashedPassword
      });

      await user.save();

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
      return res.status(201).json({
        success: true,
        token,
        user: { id: user._id, name: user.fullName, email: user.email }
      });
    });

  } catch (error) {
    console.error('Google Auth error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
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
