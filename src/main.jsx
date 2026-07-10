import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Auth0Provider } from '@auth0/auth0-react'
import './index.css'
import App from './App.jsx'

// Auth0 Configuration (Placeholder values - replace with actual in production)
const domain = import.meta.env.VITE_AUTH0_DOMAIN || "dev-placeholder.auth0.com";
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID || "placeholder-client-id";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Auth0Provider>
  </StrictMode>,
)
