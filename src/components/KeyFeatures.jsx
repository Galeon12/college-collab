import { useState, useEffect, useCallback } from 'react';
import { KEY_FEATURES } from '../data';
import './KeyFeatures.css';

// Per-feature slideshows — add more images to each array any time
const FEATURE_SLIDESHOWS = {
  'The Talent Club': [
    { src: '/tc_1.jpg', label: 'Talent Club Networking' },
    { src: '/tc_2.jpg', label: 'Industry Leader Q&A' },
    { src: '/tc_3.jpg', label: 'Exclusive HR Roundtable' },
    { src: '/tc_4.jpg', label: 'Executive Mentorship' },
    { src: '/tc_5.jpg', label: 'Tech Leadership Talk' },
    { src: '/tc_6.jpg', label: 'Networking Session' },
    { src: '/tc_7.jpg', label: 'Talent Club Meetup' },
    { src: '/tc_8.jpg', label: 'Community Interactions' },
  ],
  'The Hiring Tournament': [
    { src: '/auht_1.jpg', label: 'AUHT Kickoff' },
    { src: '/auht_2.jpg', label: 'Coding Rounds' },
    { src: '/auht_3.jpg', label: 'Participant Interaction' },
    { src: '/auht_4.jpg', label: 'Mentorship on Floor' },
    { src: '/auht_5.jpg', label: 'On-site Interviews' },
    { src: '/auht_6.jpg', label: 'Winner Announcements' },
    { src: '/auht_7.jpg', label: 'Offer Celebrations' },
  ],
  'The AlgoUniversity Advantage': [
    { src: '/alg_1.jpg', label: 'AI-Powered DSA Practice' },
    { src: '/alg_2.jpg', label: 'Expert Mentor Sessions' },
    { src: '/alg_3.jpg', label: 'AlgoPath Roadmap' },
  ],
};

const FEATURE_META = {
  'The Talent Club':           { icon: '🏆', stat: { value: '1300+', label: 'HRs, CXOs, VPs & Directors' } },
  'The Hiring Tournament':     { icon: '⚡', stat: { value: '2971',  label: 'Applications in last AUHT' } },
  'The AlgoUniversity Advantage': { icon: '🚀', stat: { value: '#2',   label: 'Globally ranked coding LLM' } },
};

// Mini per-card slideshow
function CardSlideshow({ slides }) {
  const [idx, setIdx] = useState(0);

  const advance = useCallback(() => {
    setIdx(p => (p + 1) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    const t = setInterval(advance, 3200);
    return () => clearInterval(t);
  }, [advance]);

  return (
    <div className="kf-card__slideshow">
      {slides.map((slide, i) => (
        <div key={i} className={`kf-card__slide ${i === idx ? 'visible' : ''}`}>
          {slide.src ? (
            <img src={slide.src} alt={slide.label} className="kf-card__slide-img" />
          ) : (
            <div className="kf-card__slide-placeholder">
              <span className="kf-card__placeholder-icon">📸</span>
              <span className="kf-card__placeholder-label">{slide.label}</span>
            </div>
          )}
        </div>
      ))}

      {/* Dot nav */}
      <div className="kf-card__dots">
        {slides.map((_, i) => (
          <span key={i} className={`kf-card__dot ${i === idx ? 'active' : ''}`} />
        ))}
      </div>
    </div>
  );
}

const BADGE_LABELS = {
  'The Talent Club': 'Premium Network',
  'The Hiring Tournament': 'Placement Pipeline',
  'The AlgoUniversity Advantage': 'Core Advantage'
};

export default function KeyFeatures() {
  return (
    <section className="features fade-in-section" id="features">
      <div className="container">

        {/* ── Section Header ── */}
        <div className="features__header">
          <span className="section-label">Key Features</span>
          <h2 className="section-title text-ink-900">What Sets <span className="text-crimson">Us Apart</span></h2>
          <p className="section-subtitle">
            Exclusive programmes and advantages that go beyond traditional campus training.
          </p>
        </div>

        {/* ── Feature Rows ── */}
        <div className="features__list">
          {KEY_FEATURES.map((feature, i) => {
            const meta   = FEATURE_META[feature.title];
            const slides = FEATURE_SLIDESHOWS[feature.title];
            const badgeLabel = BADGE_LABELS[feature.title] || `Highlight`;
            
            // The prompt requested: "like talent club in left and the card in right". 
            // We'll apply an alternating design for visual excellence.
            const isReversed = i % 2 !== 0;

            return (
              <div key={i} className={`kf-row ${isReversed ? 'kf-row--reverse' : ''}`}>
                
                {/* Content Side */}
                <div className="kf-row__content">
                  <div className="kf-row__badge">
                    <span>{meta.icon}</span>
                    {badgeLabel}
                  </div>
                  
                  <h3 className="kf-row__title text-ink-900">
                    {feature.title === 'The Talent Club' && <>The <span className="text-crimson">Talent Club</span></>}
                    {feature.title === 'The Hiring Tournament' && <>The <span className="text-crimson">Hiring Tournament</span></>}
                    {feature.title === 'The AlgoUniversity Advantage' && <>The AlgoUniversity <span className="text-crimson">Advantage</span></>}
                    {!['The Talent Club', 'The Hiring Tournament', 'The AlgoUniversity Advantage'].includes(feature.title) && feature.title}
                  </h3>
                  <p className="kf-row__subtitle">{feature.subtitle}</p>
                  <p className="kf-row__description">{feature.description}</p>
                  
                  <ul className="kf-row__highlights">
                    {feature.highlights.map((hl, j) => (
                      <li key={j} className="kf-row__highlight">
                        <span className="kf-row__check">
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        {hl}
                      </li>
                    ))}
                  </ul>

                  <div className="kf-row__stat">
                    <span className="kf-row__stat-val">{meta.stat.value}</span>
                    <span className="kf-row__stat-label">{meta.stat.label}</span>
                  </div>
                </div>

                {/* Media/Card Side */}
                <div className="kf-row__media card-with-logo">
                  <div className={`kf-media-card ${feature.title === 'The Talent Club' ? 'kf-media-card--portrait' : ''}`}>
                    <CardSlideshow slides={slides} />
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
