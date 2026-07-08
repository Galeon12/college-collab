import { DELIVERY_MODES } from '../data';
import './DeliveryModes.css';

export default function DeliveryModes() {
  return (
    <section className="delivery" id="delivery">
      <div className="container">
        <div className="delivery__header">
          <span className="section-label">Delivery Modes</span>
          <h2 className="section-title">Flexible Learning, Your Way</h2>
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
