import { TEAM } from '../data';
import './Team.css';

export default function Team() {
  return (
    <section className="team" id="team">
      <div className="container">
        <div className="team__header">
          <span className="section-label">Our Team</span>
          <h2 className="section-title">Meet the team behind your success</h2>
          <p className="section-subtitle">
            Our mentors are industry veterans from Google, Microsoft, Amazon, and top IITs — 
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
