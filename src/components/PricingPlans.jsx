import { PRICING_PLANS } from '../data';
import './PricingPlans.css';

export default function PricingPlans() {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="pricing fade-in-section" id="pricing">
      <div className="container">
        <div className="pricing__header">
          <span className="section-label">Plans</span>
          <h2 className="section-title text-ink-900">Choose the Right Plan <br />for <span className="text-crimson">Your Campus</span></h2>
          <p className="section-subtitle">
            Flexible pricing designed for colleges of all sizes.
            Every plan includes our industry-leading curriculum and placement support.
          </p>
        </div>

        <div className="pricing__grid">
          {PRICING_PLANS.map((plan, i) => (
            <div
              key={i}
              className={`pricing__card ${plan.highlighted ? 'pricing__card--highlighted' : ''}`}
            >
              {plan.badge && (
                <div
                  className={`pricing__badge ${plan.badge === 'Most Popular'
                    ? 'pricing__badge--popular'
                    : 'pricing__badge--premium'
                    }`}
                >
                  {plan.badge}
                </div>
              )}

              <div className="pricing__plan-name">{plan.name}</div>
              <div className="pricing__min-students">{plan.minStudents}</div>
              <p className="pricing__plan-desc">{plan.description}</p>

              <div className="pricing__divider" />

              <div className="pricing__features-title">What&apos;s Included</div>
              <div className="pricing__features">
                {plan.features.map((feature, j) => (
                  <div key={j} className="pricing__feature">
                    <span
                      className={`pricing__feature-check ${plan.highlighted
                        ? 'pricing__feature-check--crimson'
                        : 'pricing__feature-check--grey'
                        }`}
                    >
                      ✓
                    </span>
                    {feature}
                  </div>
                ))}
              </div>

              <button
                className={`pricing__cta ${plan.highlighted ? 'pricing__cta--primary' : 'pricing__cta--outline'
                  }`}
                onClick={() => scrollTo('contact')}
              >
                Get Started
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
