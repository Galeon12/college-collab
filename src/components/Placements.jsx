import { PLACEMENT_STATS, ALUMNI, HIRING_PARTNERS, COMPANY_LOGOS } from '../data';
import './Placements.css';

// Only top 4 alumni shown
const TOP_ALUMNI = ALUMNI.slice(0, 4);
// Duplicate for marquee
const marqueePartners = [...HIRING_PARTNERS, ...HIRING_PARTNERS];

export default function Placements() {
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
          {TOP_ALUMNI.map((alum, i) => (
            <div key={i} className="placements__alumni-card">
              <div className="placements__alumni-img-wrap">
                <img
                  src={alum.image}
                  alt={alum.name}
                  className="placements__alumni-photo"
                />
              </div>
              <div className="placements__alumni-details">
                <div className="placements__alumni-name">{alum.name}</div>
                <div className="placements__alumni-role">{alum.role} at</div>
                <div className="placements__alumni-company">{alum.company}</div>
                <div className="placements__alumni-package-text">CTC: {alum.package}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="placements__partners">
          <div className="placements__partners-title">
            150+ Hiring Partners Including
          </div>
          <div className="placements__marquee">
            {marqueePartners.map((partner, i) => (
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
    </section>
  );
}
