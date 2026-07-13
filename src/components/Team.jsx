import { TEAM } from '../data';
import { Hexagons, CodeSymbol } from './QuirkyBackgrounds';
import './Team.css';

function MentorCard({ member, isDuplicate }) {
  return (
    <div className={`mentor-card ${isDuplicate ? 'mentor-card--duplicate' : ''}`}>
      <div className="mentor-card__image-container">
        <img
          src={member.image}
          alt={member.name}
          className="mentor-card__image"
        />
        <div className="mentor-card__image-overlay"></div>
        {member.linkedin && (
          <a href={member.linkedin} target="_blank" rel="noreferrer" className="mentor-card__linkedin">
            in
          </a>
        )}
        <div className="mentor-card__info-overlay">
          <h3 className="mentor-card__name">{member.name}</h3>
          <span className="mentor-card__role-badge">{member.roleBadge}</span>
        </div>
      </div>
      <div className="mentor-card__bottom">
        <div className="mentor-card__college">
          <span className="mentor-card__college-icon">🎓</span> {member.college}
        </div>
        <div className="mentor-card__companies">
          {member.companies.map((company, idx) => (
            <span key={idx} className={`company-logo company-${company.toLowerCase().replace(/[^a-z0-9]/g, '')}`}>
              {company}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Team() {
  return (
    <section className="team" id="team" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Quirky elements */}
      <Hexagons className="team__quirky-hex" />
      <CodeSymbol className="team__quirky-code" color="#DC2626">&lt;/&gt;</CodeSymbol>
      <div className="container">
        <div className="team__header">
          <span className="section-label">Our Team</span>
          <h2 className="section-title text-ink-900">Meet the team behind <span className="text-crimson">your success</span></h2>
          <p className="section-subtitle">
            Our mentors are industry veterans from Google, Microsoft, Amazon, and top IITs - 
            bringing real-world engineering expertise to every classroom.
          </p>
        </div>

        <div className="team__grid">
          <div className="team__track">
            {TEAM.map((member, i) => <MentorCard key={`o-${i}`} member={member} />)}
            {TEAM.map((member, i) => <MentorCard key={`d-${i}`} member={member} isDuplicate />)}
          </div>
        </div>
      </div>
    </section>
  );
}
