import { DELIVERY_MODES } from '../data';
import { DotGrid, CodeSymbol } from './QuirkyBackgrounds';
import './DeliveryModes.css';

export default function DeliveryModes() {
  return (
    <section className="delivery fade-in-section" id="delivery" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Quirky elements */}
      <DotGrid className="delivery__quirky-dots" />
      <CodeSymbol className="delivery__quirky-code" color="#94a3b8">&#123; &#125;</CodeSymbol>
      <div className="container">
        <div className="delivery__header">
          <span className="section-label">Delivery Modes</span>
          <h2 className="section-title text-ink-900">Flexible Learning, <span className="text-crimson">Your Way</span></h2>
          <p className="section-subtitle">
            Choose the delivery mode that best fits your campus infrastructure 
            and student needs — all modes deliver the same rigorous curriculum.
          </p>
        </div>

        <div className="delivery__grid">
          {DELIVERY_MODES.map((mode, i) => (
            <div key={i} className="delivery__card">
              <h3 className="delivery__card-title">{mode.mode}</h3>
              <div className="delivery__features">
                {mode.features.map((feature, j) => (
                  <div key={j} className="delivery__feature">
                    <span className="delivery__feature-check">✓</span>
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
