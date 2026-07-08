import { YC_COMPANIES } from '../data';
import './YCombinator.css';

export default function YCombinator() {
  return (
    <section className="ycombinator" id="about">
      <div className="container ycombinator__inner">
        <div className="ycombinator__content">
          <span className="section-label">About Us</span>
          <h2 className="section-title ycombinator__title">
            Backed by the World's Most <br />Prestigious Accelerator
          </h2>
          <p className="ycombinator__desc">
            AlgoUniversity is a Y Combinator (W21) backed ed-tech company
            on a mission to democratise access to world-class technical education.
            Our practitioner-led pedagogy is designed by engineers who've built
            products at Google, Microsoft, Amazon, and other top tech companies.
          </p>

          <div className="ycombinator__highlights">
            <div className="ycombinator__highlight">
              <span className="ycombinator__highlight-icon">🎓</span>
              <div className="ycombinator__highlight-text">
                <h4>Practitioner-Led Pedagogy</h4>
                <p>Learn from engineers who have cracked FAANG interviews and built large-scale systems.</p>
              </div>
            </div>
            <div className="ycombinator__highlight">
              <span className="ycombinator__highlight-icon">🌍</span>
              <div className="ycombinator__highlight-text">
                <h4>Global Network</h4>
                <p>Part of the YC ecosystem alongside Airbnb, Stripe, Dropbox, and 4000+ startups.</p>
              </div>
            </div>
            <div className="ycombinator__highlight">
              <span className="ycombinator__highlight-icon">📊</span>
              <div className="ycombinator__highlight-text">
                <h4>Data-Driven Results</h4>
                <p>Progress tracking, analytics dashboards, and benchmark tests to measure student growth.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="ycombinator__visual">
          <div className="ycombinator__yc-badge">
            <div className="yc-logo">Y</div>
            <div className="yc-text">
              BACKED BY
              <span>Y Combinator</span>
            </div>
          </div>

          <div className="ycombinator__partners">
            <div className="ycombinator__partners-title">Our Alumni Work At</div>
            <div className="ycombinator__partner-grid">
              {YC_COMPANIES.map((company, i) => (
                <div key={i} className="ycombinator__partner-item">{company}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
