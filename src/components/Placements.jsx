import { useState } from 'react';
import { PLACEMENT_STATS, HIRING_PARTNERS, COMPANY_LOGOS, ALUMNI_SPOTLIGHT_VIDEOS } from '../data';
import { FiPlay } from 'react-icons/fi';
import './Placements.css';

export default function Placements() {
  const [activeVideoId, setActiveVideoId] = useState(null);
  return (
    <section className="placements" id="placements">
      <div className="container">
        <div className="placements__header">
          <span className="section-label">Results</span>
          <h2 className="section-title text-ink-900">Placement Results <span className="text-crimson">That Speak</span></h2>
          <p className="section-subtitle">
            Our alumni are placed at the world's leading tech companies, 
            with consistently exceptional CTC packages.
          </p>
        </div>

        <div className="placements__stats">
          {PLACEMENT_STATS.map((stat, i) => (
            <div key={i} className="placements__stat-card">
              <div className="placements__stat-value">{stat.value}</div>
              <div className="placements__stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Alumni Spotlight - title row with See More */}
        <div className="placements__alumni-header">
          <h3 className="placements__alumni-title">Alumni Spotlight</h3>
          <a
            href="https://algouniversity.com/alumni"
            target="_blank"
            rel="noopener noreferrer"
            className="placements__see-more"
          >
            See More →
          </a>
        </div>

        {/* Top 4 grid - no slider */}
        <div className="placements__alumni-grid">
          {ALUMNI_SPOTLIGHT_VIDEOS.map((t, i) => (
            <div 
              key={i} 
              className="spotlight-card"
              onClick={() => setActiveVideoId(t.videoId)}
            >
              <div className="spotlight-card__media">
                <img 
                  src={t.image} 
                  alt={t.name}
                  className="spotlight-card__thumb"
                />
                <div className="spotlight-card__overlay"></div>
                
                <div className="spotlight-card__play-btn">
                  <FiPlay className="spotlight-card__play-icon" />
                </div>
              </div>

              <div className="spotlight-card__info">
                <h3 className="spotlight-card__name">{t.name}</h3>
                <div className="spotlight-card__role">
                  {t.company} • {t.role}
                </div>
                <div className="spotlight-card__stipend">
                  {t.stipend}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="placements__partners">
          <div className="placements__partners-title">
            150+ Hiring Partners Including
          </div>
          <div className="placements__marquee">
            {[...HIRING_PARTNERS, ...HIRING_PARTNERS].map((partner, i) => (
              <div key={i} className="placements__partner-logo-wrap">
                <img
                  src={COMPANY_LOGOS[partner]}
                  alt={partner}
                  className="placements__partner-logo"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Video Modal Overlay */}
      {activeVideoId && (
        <div className="video-modal" onClick={() => setActiveVideoId(null)}>
          <div className="video-modal__content" onClick={(e) => e.stopPropagation()}>
            <button className="video-modal__close" onClick={() => setActiveVideoId(null)}>&times;</button>
            <div className="video-modal__ratio-box">
              <iframe
                src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="video-modal__iframe"
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
