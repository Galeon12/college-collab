import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import AuthModal from './AuthModal';
import { BRAND } from '../data';
import './Navbar.css';

const NAV_ITEMS = [
  { label: 'Roadmap', target: 'roadmap' },
  { label: 'Features', target: 'features' },
  { label: 'Curriculum', target: 'training' },
  { label: 'Results', target: 'placements' },
  { label: 'Plans', target: 'pricing' },
  { label: 'FAQ', target: 'faq' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signup');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [localUser, setLocalUser] = useState(null);
  const { loginWithRedirect, logout: auth0Logout } = useAuth0();
  
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      if (token && userStr) {
        setIsLoggedIn(true);
        setLocalUser(JSON.parse(userStr));
      } else {
        setIsLoggedIn(false);
        setLocalUser(null);
      }
    };
    
    checkAuth();
    window.addEventListener('authChange', checkAuth);

    const handleOpenAuth = (e) => {
      if (e.detail && e.detail.mode) {
        setAuthMode(e.detail.mode);
      }
      setAuthModalOpen(true);
    };
    window.addEventListener('openAuthModal', handleOpenAuth);

    return () => {
      window.removeEventListener('authChange', checkAuth);
      window.removeEventListener('openAuthModal', handleOpenAuth);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('authChange'));
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const firstName = localUser?.name?.split(' ')[0] || localUser?.email?.split('@')[0] || 'User';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} id="navbar">
      <div className="navbar__inner">
        <a href="#" className="navbar__logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
         <img className='navlogo' src="/algologo.png" alt="logo"/>
        </a>

        <div className="navbar__links">
          {NAV_ITEMS.map((item) => (
            <button key={item.target} className="navbar__link" onClick={() => scrollTo(item.target)}>
              {item.label}
            </button>
          ))}
          {!isLoggedIn ? (
            <button className="navbar__cta" onClick={() => { setAuthMode('signup'); setAuthModalOpen(true); }}>
              Sign Up
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '16px' }}>
              <span style={{ 
                fontWeight: '600', 
                color: '#ffffff',
                marginRight: '8px'
              }}>
                Hi, {firstName}
              </span>
              <button className="navbar__cta navbar__logout" onClick={handleLogout}>
                Log Out
              </button>
            </div>
          )}
        </div>

        <button
          className="navbar__mobile-toggle"
          aria-label="Toggle menu"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className={`navbar__mobile-menu ${mobileOpen ? 'open' : ''}`}>
        {NAV_ITEMS.map((item) => (
          <button key={item.target} className="navbar__mobile-link" onClick={() => scrollTo(item.target)}>
            {item.label}
          </button>
        ))}
        {!isLoggedIn ? (
          <button className="navbar__mobile-cta" onClick={() => { setMobileOpen(false); setAuthMode('signup'); setAuthModalOpen(true); }}>
            Sign Up
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%', marginTop: '16px' }}>
            <span style={{ 
              fontWeight: '600', 
              color: 'var(--grey-800)',
              marginBottom: '4px'
            }}>
              Hi, {firstName}
            </span>
            <button className="navbar__mobile-cta navbar__logout" onClick={handleLogout}>
            Log Out
          </button>
        </div>
        )}
      </div>

      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        initialMode={authMode} 
      />
    </nav>
  );
}
