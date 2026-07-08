import { useState, useEffect } from 'react';
import { BRAND } from '../data';
import './Navbar.css';

const NAV_ITEMS = [
  { label: 'Training', target: 'training' },
  { label: 'Features', target: 'features' },
  { label: 'Results', target: 'placements' },
  { label: 'Plans', target: 'pricing' },
  { label: 'FAQ', target: 'faq' },
  { label: 'About', target: 'about' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
          <button className="navbar__cta" onClick={() => scrollTo('contact')}>
            Connect Now
          </button>
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
        <button className="navbar__mobile-cta" onClick={() => scrollTo('contact')}>
          Connect Now
        </button>
      </div>
    </nav>
  );
}
