import { TEAM } from '../data';
import { Hexagons, CodeSymbol } from './QuirkyBackgrounds';
import './Team.css';

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
          {TEAM.slice(0, 4).map((member, i) => (
            <div key={i} className="team__card">
              <img
                src={member.image}
                alt={member.name}
                className="team__avatar"
              />
              <div className="team__name">{member.name}</div>
              <div className="team__role">{member.role}</div>
              <div className="team__credential">{member.credential}</div>
              <div className="team__education">{member.education}</div>
              <span className="team__expertise-badge">{member.expertise}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
