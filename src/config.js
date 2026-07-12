// Vite inlines these at build time. Production builds are guaranteed to have them:
// vite.config.js fails the build if any are missing, so the fallbacks below are
// only ever reached in development.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Google's universal test key, which always passes verification. Development only.
export const RECAPTCHA_SITE_KEY =
  import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
