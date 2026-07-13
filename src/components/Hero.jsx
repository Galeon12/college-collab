import { FiDownload, FiArrowRight } from 'react-icons/fi';
import './Hero.css';

export default function Hero() {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="hero" id="hero">
      {/* Video Background */}
      <video
        className="hero__video-bg"
        src="/videos/hero.mp4"
        poster="/auht_1.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
      {/* Clean dark overlay - no red tint */}
      <div className="hero__overlay" />
      {/* Bottom gradient fade to white */}
      <div className="hero__bottom-fade" />

      <div className="container hero__inner">
        <div className="hero__content">
          <div className="hero__badge">
            Backed by Y Combinator (S21)
          </div>

          <h1 className="hero__title">
            Campus Training <br />
            <span>Programme</span>
          </h1>

          <p className="hero__desc">
            A premier ecosystem engineered specifically to upgrade your institution's technical competitive edge. 
            Moving far beyond generic placement preparation, we infuse students with deep algorithmic instincts and robust system-design fundamentals.
          </p>

          <div className="hero__actions">
            <a
              href="/Campus-Training-Programme-Brochure.pdf"
              download
              className="hero__btn-primary"
              style={{ textDecoration: 'none' }}
            >
              <FiDownload /> Download Brochure
            </a>
            <button className="hero__btn-secondary" onClick={() => scrollTo('contact')}>
              Connect Now <FiArrowRight />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
