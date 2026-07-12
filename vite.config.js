import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Missing VITE_* values get inlined as `undefined` and then fail silently in the
// browser, so a production build without them must not be publishable at all.
const REQUIRED_PROD_ENV = [
  'VITE_API_URL',
  'VITE_AUTH0_DOMAIN',
  'VITE_AUTH0_CLIENT_ID',
  'VITE_RECAPTCHA_SITE_KEY',
]

// Only needed when the acknowledgement email is switched on, which it is by default.
// Turning it off (VITE_EMAIL_ACK_ENABLED=false) is what lets you deploy without EmailJS
// credentials; leaving it on without them is a build error rather than a silent no-op,
// because an applicant who is never emailed has no way of knowing.
const REQUIRED_FOR_EMAIL_ACK = [
  'VITE_EMAILJS_SERVICE_ID',
  'VITE_EMAILJS_TEMPLATE_ID',
  'VITE_EMAILJS_PUBLIC_KEY',
]

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), '')

    const required = env.VITE_EMAIL_ACK_ENABLED === 'false'
      ? REQUIRED_PROD_ENV
      : [...REQUIRED_PROD_ENV, ...REQUIRED_FOR_EMAIL_ACK]

    const missing = required.filter((key) => !env[key])
    if (missing.length > 0) {
      const emailOnly = missing.every((key) => REQUIRED_FOR_EMAIL_ACK.includes(key))

      throw new Error(
        'Production build is missing required environment variables:\n' +
        missing.map((key) => `  - ${key}`).join('\n') +
        '\n\nSee .env.example.' +
        (emailOnly
          ? '\nTo deploy without the acknowledgement email, set VITE_EMAIL_ACK_ENABLED=false.'
          : '')
      )
    }
  }

  return {
    plugins: [react()],
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'unsafe-none',
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
      },
    },
    build: {
      chunkSizeWarningLimit: 1600,
    },
  }
})
