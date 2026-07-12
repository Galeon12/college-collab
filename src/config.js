// Vite inlines these at build time. Production builds are guaranteed to have them:
// vite.config.js fails the build if any are missing, so the fallbacks below are
// only ever reached in development.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Google's universal test key, which always passes verification. Development only.
export const RECAPTCHA_SITE_KEY =
  import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

/**
 * Whether to send the applicant an acknowledgement email via EmailJS.
 *
 * Opt-OUT, not opt-in: the default is on, because quietly not emailing someone who just applied
 * is a worse failure than a build error. Set VITE_EMAIL_ACK_ENABLED=false to deploy without
 * EmailJS credentials at all -- vite.config.js then stops requiring them.
 *
 * The application itself is saved either way. This only controls the acknowledgement.
 */
export const EMAIL_ACK_ENABLED =
  import.meta.env.VITE_EMAIL_ACK_ENABLED !== 'false';

export const EMAILJS = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
};
