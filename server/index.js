// Must precede ./db/airtable.js, which reads process.env at load time.
import { IS_PRODUCTION, allowedOrigins, config } from './env.js';
import express from 'express';
import cors from 'cors';
import storage from './db/airtable.js';
import { initSpool, appendToSpool, spoolDepth } from './db/spool.js';
import { startDrainer } from './db/drain.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 5000;

/**
 * Guards the check-then-create window on application submits.
 *
 * findApplicationByEmail -> createApplication is a TOCTOU race, and Airtable has no unique
 * constraint to fall back on. Holding the email for the duration of the window closes the
 * realistic race: a double-clicked submit button, or two tabs.
 *
 * LIMIT: in-process only. It reduces duplicates, it does not eliminate them, and it stops
 * working across more than one server instance. That is the honest ceiling of running
 * without a real database.
 */
const inFlightEmails = new Set();

async function withEmailLock(email, fn) {
  const key = email.trim().toLowerCase();

  if (inFlightEmails.has(key)) {
    const error = new Error('A submission for this email is already being processed.');
    error.code = 'DUPLICATE_IN_FLIGHT';
    throw error;
  }

  inFlightEmails.add(key);
  try {
    return await fn();
  } finally {
    inFlightEmails.delete(key);
  }
}

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    if (!IS_PRODUCTION && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

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
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// Applicant records are PII, so listing them takes a separate operator credential
// rather than any signed-in user's token.
const requireAdmin = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(403).json({ success: false, message: 'Forbidden.' });
  }
  next();
};

// Submit Application
app.post('/api/applications', requireAuth, async (req, res) => {
  const { name, college, email, phone, message } = req.body;

  // Basic validation
  if (!name || !college || !email) {
    return res.status(400).json({
      success: false,
      message: 'Name, college, and email are required fields.'
    });
  }

  const application = { name, college, email, phone, message };

  try {
    return await withEmailLock(email, async () => {
      // Check if an application with this email already exists
      const existingApplication = await storage.findApplicationByEmail(email);
      if (existingApplication) {
        return res.status(400).json({
          success: false,
          message: 'An application with this email address has already been submitted.'
        });
      }

      const newApplication = await storage.createApplication(application);
      console.log(`Saved new application: ${name} (${college})`);

      return res.status(201).json({
        success: true,
        message: 'Application submitted successfully!',
        data: newApplication
      });
    });
  } catch (error) {
    if (error.code === 'DUPLICATE_IN_FLIGHT') {
      return res.status(409).json({
        success: false,
        message: 'This application is already being submitted. Please wait a moment.'
      });
    }

    console.error('Airtable write failed for application:', error.message);

    // Airtable is unreachable, throttled, or broken. Spool the submission so it is not lost,
    // and tell the applicant we have it — because we do. The drainer will land it in Airtable
    // shortly. Answering with an error here would be a lie AND would provoke a re-submit.
    try {
      const entry = await appendToSpool({ op: 'createApplication', payload: application });
      console.warn(`Spooled application ${entry.id} (${email}) for retry`);

      return res.status(202).json({
        success: true,
        message: 'Application received!'
      });
    } catch (spoolError) {
      console.error('SPOOL WRITE FAILED — APPLICATION LOST:', spoolError.message);
      // Last resort: the payload is in the logs, which is the only copy left.
      console.error('Lost payload:', JSON.stringify(application));
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
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${captchaToken}`;
    
    const recaptchaRes = await fetch(verifyUrl, { method: 'POST' });
    const recaptchaData = await recaptchaRes.json();
    
    if (!recaptchaData.success) {
      return res.status(400).json({ success: false, message: 'reCAPTCHA verification failed.' });
    }

    const existingUser = await storage.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await storage.createUser({
      fullName,
      email: email.toLowerCase(),
      phone,
      isWhatsapp,
      institution,
      designation,
      password: hashedPassword
    });

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

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

    // The only route that reads the hash, and the only one that may call this.
    const user = await storage.findUserCredentialsByEmail(email);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

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
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
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

      let user = await storage.findUserByEmail(email);

      // If user exists, log them in
      if (user) {
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
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

      user = await storage.createUser({
        fullName: name,
        email: email.toLowerCase(),
        phone,
        isWhatsapp: !!isWhatsapp,
        institution,
        designation,
        password: hashedPassword
      });

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
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

// Get all applications (admin only — returns applicant PII).
// Returns every row, newest first. No limit/pagination on purpose: a default cap would
// silently truncate the operator's view of their own applicants with no signal that rows
// were dropped, which is worse than a large response.
app.get('/api/applications', requireAdmin, async (req, res) => {
  try {
    const applications = await storage.getAllApplications();
    return res.json({ success: true, count: applications.length, data: applications });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// Operational health. Also gated: spool depth leaks how badly Airtable is failing.
app.get('/api/health', requireAdmin, async (req, res) => {
  return res.json({
    success: true,
    spool: {
      dir: config.SPOOL_DIR,
      pending: await spoolDepth(),
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong on the server!' });
});

// The spool must be proven writable BEFORE we accept traffic — in production a failed probe
// exits. Accepting submissions with no safety net is how you lose the one you meant to save.
await initSpool();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  startDrainer(storage);
});
