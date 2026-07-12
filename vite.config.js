import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Missing VITE_* values get inlined as `undefined` and then fail silently in the
// browser, so a production build without them must not be publishable at all.
const REQUIRED_PROD_ENV = [
  'VITE_API_URL',
  'VITE_AUTH0_DOMAIN',
  'VITE_AUTH0_CLIENT_ID',
  'VITE_RECAPTCHA_SITE_KEY',
  'VITE_EMAILJS_SERVICE_ID',
  'VITE_EMAILJS_TEMPLATE_ID',
  'VITE_EMAILJS_PUBLIC_KEY',
]

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), '')
    const missing = REQUIRED_PROD_ENV.filter((key) => !env[key])
    if (missing.length > 0) {
      throw new Error(
        'Production build is missing required environment variables:\n' +
        missing.map((key) => `  - ${key}`).join('\n') +
        '\n\nSee .env.example. In CI these come from GitHub repository variables.'
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
