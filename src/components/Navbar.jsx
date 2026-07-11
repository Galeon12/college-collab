import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
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
  const { loginWithRedirect, logout, user, isAuthenticated } = useAuth0();
  
  const userInitial = user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U';

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
         <img className='navlogo' src="https://d1lrk9cp1c3gxw.cloudfront.net/static/nurture/images/logo.png" alt="logo"/>
        </a>

        <div className="navbar__links">
          {NAV_ITEMS.map((item) => (
            <button key={item.target} className="navbar__link" onClick={() => scrollTo(item.target)}>
              {item.label}
            </button>
          ))}
          {!isAuthenticated ? (
            <button className="navbar__cta" onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })}>
              Signup/Login
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--crimson)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '18px'
              }}>
                {userInitial}
              </div>
              <button className="navbar__cta" style={{ background: 'var(--grey-200)', color: 'var(--grey-800)' }} onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
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
        {!isAuthenticated ? (
          <button className="navbar__mobile-cta" onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })}>
            Signup/Login
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%', marginTop: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--crimson)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '20px'
            }}>
              {userInitial}
            </div>
            <button className="navbar__mobile-cta" style={{ background: 'var(--grey-200)', color: 'var(--grey-800)' }} onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
            Log Out
          </button>
        </div>
        )}
      </div>
    </nav>
  );
}
