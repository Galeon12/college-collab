// Must precede ./db/airtable.js, which reads process.env at load time.
import { IS_PRODUCTION, allowedOrigins, config } from './env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { promisify } from 'node:util';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import storage from './db/airtable.js';
import { initSpool, appendToSpool, spoolDepth } from './db/spool.js';
import { startDrainer } from './db/drain.js';
import { validateApplication, validateSignup, validateGoogleProfile } from './validate.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 5000;

// Azure App Service terminates TLS and forwards the client IP in X-Forwarded-For. Without
// this, every request looks like it came from the proxy and the rate limiters below would
// bucket the whole internet together. Only in production: trusting the header when we are NOT
// behind a proxy would let any caller spoof their IP and walk straight past the limiter.
if (IS_PRODUCTION) app.set('trust proxy', 1);

const limiterDefaults = {
  windowMs: 15 * 60 * 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
};

/**
 * Login was completely unthrottled and therefore brute-forceable.
 *
 * Only genuinely REJECTED attempts count against the budget:
 *  - a success (2xx) does not, so a legitimate user working normally never trips this;
 *  - a server fault (5xx) does not either. Counting those would mean an Airtable outage
 *    locks real users out for 15 minutes for a failure that was entirely ours.
 * What is left is 4xx: wrong password, unknown account. Exactly the brute-force signal.
 *
 * LIMIT: the store is in-memory, so counters are per-instance and reset on restart. That is
 * consistent with the rest of this server's single-instance assumption; a second instance
 * would need a shared store.
 */
const loginLimiter = rateLimit({
  ...limiterDefaults,
  limit: 10,
  skipSuccessfulRequests: true,
  requestWasSuccessful: (req, res) => res.statusCode < 400 || res.statusCode >= 500,
  message: { success: false, message: 'Too many failed login attempts. Please try again in 15 minutes.' },
});

// Signup and Google sign-in create records, so they are throttled even when they succeed.
const authLimiter = rateLimit({
  ...limiterDefaults,
  limit: 20,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
});

// Backstop for everything else under /api.
const apiLimiter = rateLimit({
  ...limiterDefaults,
  limit: 200,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

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
app.use(helmet());
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
// Bounded: the largest legitimate body is an application with a 5,000 character message.
app.use(express.json({ limit: '32kb' }));
app.use('/api', apiLimiter);

// Unauthenticated liveness check. Azure's health probe uses this; it deliberately reveals
// nothing about the spool (see /api/health for that, which is admin-gated).
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

/** Constant-time compare, so the admin key cannot be recovered byte by byte from timings. */
const secretsMatch = (a, b) => {
  const left = Buffer.from(String(a ?? ''));
  const right = Buffer.from(String(b ?? ''));
  // timingSafeEqual throws on a length mismatch. Length is not the secret; the bytes are.
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};

// Applicant records are PII, so listing them takes a separate operator credential
// rather than any signed-in user's token.
const requireAdmin = (req, res, next) => {
  if (!secretsMatch(req.headers['x-admin-key'], process.env.ADMIN_API_KEY)) {
    return res.status(403).json({ success: false, message: 'Forbidden.' });
  }
  next();
};

// Submit Application
app.post('/api/applications', requireAuth, async (req, res) => {
  const problem = validateApplication(req.body);
  if (problem) {
    return res.status(400).json({ success: false, message: problem });
  }

  const { name, college, email, phone, message } = req.body;
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
    // and tell the applicant we have it -- because we do. The drainer will land it in Airtable
    // shortly. Answering with an error here would be a lie AND would provoke a re-submit.
    try {
      const entry = await appendToSpool({ op: 'createApplication', payload: application });
      console.warn(`Spooled application ${entry.id} (${email}) for retry`);

      return res.status(202).json({
        success: true,
        message: 'Application received!'
      });
    } catch (spoolError) {
      console.error('SPOOL WRITE FAILED -- APPLICATION LOST:', spoolError.message);
      // Last resort: the payload is in the logs, which is the only copy left.
      console.error('Lost payload:', JSON.stringify(application));
    }

    return res.status(500).json({
      success: false,
      message: 'An error occurred while saving the application. Please try again.'
    });
  }
});

/**
 * Verifies a reCAPTCHA token with Google.
 *
 * Sends the secret and token as a form body rather than interpolating them into the URL: the
 * token is user-supplied, and an unencoded '&' or '#' in it would silently truncate the query
 * string and change what we are asking Google. Bounded by a timeout so a slow Google cannot
 * hang signup indefinitely.
 */
async function verifyRecaptcha(token) {
  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: process.env.RECAPTCHA_SECRET, response: token }),
    signal: AbortSignal.timeout(5_000),
  });

  const result = await response.json();
  return result.success === true;
}

// --- Auth Routes ---
app.post('/api/auth/signup', authLimiter, async (req, res) => {
  try {
    const problem = validateSignup(req.body);
    if (problem) {
      return res.status(400).json({ success: false, message: problem });
    }

    const { fullName, email, phone, isWhatsapp, institution, designation, password, captchaToken } = req.body;

    if (!captchaToken) {
      return res.status(400).json({ success: false, message: 'reCAPTCHA verification failed. Please try again.' });
    }

    if (!await verifyRecaptcha(captchaToken)) {
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

// A real bcrypt hash of a value nobody can log in with. Compared against when the email does
// not exist, so that a miss costs the same time as a wrong password. Returning early instead
// would make "no such user" measurably faster than "wrong password", which lets an attacker
// enumerate who has an account.
const ABSENT_USER_HASH = bcrypt.hashSync(randomBytes(32).toString('hex'), 10);

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    // The only route that reads the hash, and the only one that may call this.
    const user = await storage.findUserCredentialsByEmail(email);

    const isMatch = await bcrypt.compare(password, user?.passwordHash ?? ABSENT_USER_HASH);
    if (!user || !isMatch) {
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

/**
 * Awaitable token verification.
 *
 * The callback form of jwt.verify was previously given an ASYNC callback that awaited Airtable.
 * If that await rejected -- a transient Airtable blip during sign-in -- the rejection escaped
 * into nothing: the route's try/catch had already returned, so it became an unhandled rejection,
 * and Node's default (--unhandled-rejections=throw) TAKES THE PROCESS DOWN. The request also
 * never got a response. Awaiting the promise instead puts those errors back inside the route's
 * try/catch, where they belong.
 */
const verifyIdToken = promisify(jwt.verify);

app.post('/api/auth/google', authLimiter, async (req, res) => {
  try {
    const { idToken, phone, institution, designation, isWhatsapp } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: 'ID token is required.' });
    }

    let decoded;
    try {
      decoded = await verifyIdToken(idToken, getKey, {
        algorithms: ['RS256'],
        // Pin the issuer so a token minted by some other Auth0 tenant is not accepted here.
        issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      });
    } catch (verifyError) {
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

    const problem = validateGoogleProfile(req.body);
    if (problem) {
      return res.status(400).json({ success: false, message: problem });
    }

    // Google users never use this password, but it still must not be guessable: Math.random()
    // is not a CSPRNG, and this hash is what would protect the account if password login were
    // ever enabled for it.
    const randomPassword = randomBytes(32).toString('hex');
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

  } catch (error) {
    console.error('Google Auth error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// Get all applications (admin only -- returns applicant PII).
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
  // A rejected origin is the caller's fault, not ours. Reporting it as a 500 sends operators
  // hunting for a server fault that does not exist.
  if (err?.message === 'Not allowed by CORS') {
    return res.status(403).json({ success: false, message: 'Origin not allowed.' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body is too large.' });
  }

  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong on the server!' });
});

// The spool must be proven writable BEFORE we accept traffic. In production a failed probe
// exits. Accepting submissions with no safety net is how you lose the one you meant to save.
await initSpool();

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  startDrainer(storage);
});

// Azure sends SIGTERM on restart, scale, and redeploy. Finish in-flight requests rather than
// dropping them mid-write, but do not hang forever if a connection refuses to close.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`${signal} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
