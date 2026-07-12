import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuth0 } from '@auth0/auth0-react';
import { COUNTRIES } from '../data/countries';
import { API_BASE_URL, RECAPTCHA_SITE_KEY } from '../config';
import './AuthModal.css';

export default function AuthModal({ isOpen, onClose, initialMode = 'signup' }) {
  const [mode, setMode] = useState(initialMode); // 'signup' | 'login' | 'googleSignup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { loginWithPopup, getIdTokenClaims } = useAuth0();

  // ReCAPTCHA ref
  const recaptchaRef = useRef(null);

  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    countryCode: '+91',
    phone: '',
    isWhatsapp: false,
    institution: '',
    designation: '',
    password: '',
    rememberMe: false
  });

  const [googleIdToken, setGoogleIdToken] = useState(null);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleGoogleAuth = async () => {
    setError(null);
    try {
      await loginWithPopup({
        authorizationParams: {
          connection: 'google-oauth2',
          prompt: 'select_account'
        }
      });
      const claims = await getIdTokenClaims();

      if (!claims || !claims.__raw) {
        throw new Error("Failed to get Google ID Token");
      }

      setLoading(true);
      const idToken = claims.__raw;
      setGoogleIdToken(idToken);

      const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.dispatchEvent(new Event('authChange'));
        onClose();
        alert('Successfully logged in with Google!');
      } else if (data.requiresExtraFields) {
        // User doesn't exist, we need to collect extra required fields
        setMode('googleSignup');
      } else {
        setError(data.message || 'Google Auth failed');
      }
    } catch (err) {
      console.error(err);
      setError('Google authentication was cancelled or failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignupSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: googleIdToken,
          phone: formData.phone,
          isWhatsapp: formData.isWhatsapp,
          institution: formData.institution,
          designation: formData.designation
        })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.dispatchEvent(new Event('authChange'));
        onClose();
        alert('Successfully signed up with Google!');
      } else {
        setError(data.message || 'Google Signup failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);

    const captchaToken = recaptchaRef.current?.getValue();
    if (!captchaToken) {
      setError('Please complete the reCAPTCHA to prove you are not a robot.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, captchaToken })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.dispatchEvent(new Event('authChange'));
        onClose();
        alert('Successfully signed up!');
      } else {
        setError(data.message || 'Signup failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.dispatchEvent(new Event('authChange'));
        onClose();
        alert('Successfully logged in!');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-content" onClick={e => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose}>&times;</button>

        {mode === 'googleSignup' ? (
          <div className="auth-modal-form" key="googleSignup">
            <h2>Almost Done!</h2>
            <p>Please complete your profile to finish signing up.</p>

            {error && <div className="auth-error" style={{ color: '#e11d48', fontSize: '14px', marginBottom: '16px' }}>{error}</div>}

            <form onSubmit={handleGoogleSignupSubmit}>
              <div className="form-group">
                <label>Phone number</label>
                <div className="auth-phone-input">
                  <select name="countryCode" className="country-code" value={formData.countryCode} onChange={handleInputChange}>
                    {COUNTRIES.map((c, idx) => (
                      <option key={idx} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                  <input type="tel" name="phone" placeholder="Phone number" required value={formData.phone} onChange={handleInputChange} />
                </div>
              </div>

              <label className="auth-checkbox" style={{ marginTop: '-8px' }}>
                <input type="checkbox" name="isWhatsapp" checked={formData.isWhatsapp} onChange={handleInputChange} />
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="#25D366" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                  This is my whatsapp number
                </span>
              </label>

              <div className="form-group">
                <label>Institution/Organisation</label>
                <input type="text" name="institution" placeholder="Institution" required value={formData.institution} onChange={handleInputChange} />
              </div>

              <div className="form-group">
                <label>Designation</label>
                <input type="text" name="designation" placeholder="Designation" required value={formData.designation} onChange={handleInputChange} />
              </div>

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? 'Saving...' : 'Complete Sign Up'}
              </button>
            </form>
          </div>
        ) : mode === 'signup' ? (
          <div className="auth-modal-form" key="signup">
            <h2>Create Account</h2>
            <p>Already have an account? <span className="auth-link" onClick={() => { setMode('login'); setError(null); }}>Login</span></p>

            <button className="auth-google-btn" type="button" onClick={handleGoogleAuth} disabled={loading}>
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" />
              Continue with Google
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            {error && <div className="auth-error" style={{ color: '#e11d48', fontSize: '14px', marginBottom: '16px' }}>{error}</div>}

            <form onSubmit={handleSignup}>
              <div className="form-group">
                <label>Full name</label>
                <input type="text" name="fullName" placeholder="Enter your full name" required value={formData.fullName} onChange={handleInputChange} />
              </div>

              <div className="form-group">
                <label>Email address</label>
                <input type="email" name="email" placeholder="Email address" required value={formData.email} onChange={handleInputChange} />
              </div>

              <div className="form-group">
                <label>Phone number</label>
                <div className="auth-phone-input">
                  <select name="countryCode" className="country-code" value={formData.countryCode} onChange={handleInputChange}>
                    {COUNTRIES.map((c, idx) => (
                      <option key={idx} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                  <input type="tel" name="phone" placeholder="Phone number" required value={formData.phone} onChange={handleInputChange} />
                </div>
              </div>

              <label className="auth-checkbox" style={{ marginTop: '-8px' }}>
                <input type="checkbox" name="isWhatsapp" checked={formData.isWhatsapp} onChange={handleInputChange} />
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="#25D366" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                  This is my whatsapp number
                </span>
              </label>

              <div className="auth-row">
                <div className="form-group">
                  <label>Institution/Organisation</label>
                  <input type="text" name="institution" placeholder="Institution" required value={formData.institution} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Designation</label>
                  <input type="text" name="designation" placeholder="Designation" required value={formData.designation} onChange={handleInputChange} />
                </div>
              </div>

              <div className="form-group">
                <label>Password</label>
                <input type="password" name="password" placeholder="Enter Password" required value={formData.password} onChange={handleInputChange} />
              </div>

              <div className="recaptcha-container">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={RECAPTCHA_SITE_KEY}
                  onExpired={() => {
                    setError('reCAPTCHA verification expired. Please check the checkbox again.');
                    if (recaptchaRef.current) {
                      recaptchaRef.current.reset();
                    }
                  }}
                  onErrored={() => {
                    setError('reCAPTCHA failed to load. Please check your internet connection or ad blocker.');
                  }}
                />
              </div>

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? 'Signing up...' : 'Sign up'}
              </button>

              <p className="auth-footer">
                By creating this account, you agree to our <a href="https://www.algouniversity.com/terms/" target="_blank" rel="noreferrer">Terms of Service</a> & <a href="https://www.algouniversity.com/privacy/" target="_blank" rel="noreferrer">Privacy Policy</a>.
              </p>
            </form>
          </div>
        ) : (
          <div className="auth-modal-form" key="login">
            <h2>Log in</h2>
            <p>New user ? <span className="auth-link" onClick={() => { setMode('signup'); setError(null); }}>Register Now</span></p>

            <button className="auth-google-btn" type="button" onClick={handleGoogleAuth} disabled={loading}>
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" />
              Continue with Google
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            {error && <div className="auth-error" style={{ color: '#e11d48', fontSize: '14px', marginBottom: '16px' }}>{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Username or Email</label>
                <input type="email" name="email" placeholder="Username or email" required value={formData.email} onChange={handleInputChange} />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input type="password" name="password" placeholder="Enter Password" required value={formData.password} onChange={handleInputChange} />
              </div>

              <div className="auth-options">
                <label className="auth-checkbox">
                  <input type="checkbox" name="rememberMe" checked={formData.rememberMe} onChange={handleInputChange} />
                  Remember me
                </label>
                <div className="auth-forgot-password">
                  <a href="#">Forgot Password</a>
                </div>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              <p className="auth-footer">
                By creating this account, you agree to our <a href="https://www.algouniversity.com/terms/" target="_blank" rel="noreferrer">Terms of Service</a> & <a href="https://www.algouniversity.com/privacy/" target="_blank" rel="noreferrer">Privacy Policy</a>.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
