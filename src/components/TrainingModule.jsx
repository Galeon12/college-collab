import { useState, useEffect, useRef } from 'react';
import { CURRICULUM_PLANS, PLAN_KEYS } from '../data';
import './TrainingModule.css';

function TopicCard({ item }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="tm-topic-card">
      <div 
        className="tm-topic-card__name" 
        onClick={() => item.dropdownList && setExpanded(!expanded)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: item.dropdownList ? 'pointer' : 'default' }}
      >
        <span>{item.title}</span>
        {item.dropdownList && (
          <span style={{ 
            transform: expanded ? 'rotate(180deg)' : 'none', 
            transition: 'transform 0.2s', 
            fontSize: '12px',
            color: 'var(--crimson)',
            marginTop: '2px'
          }}>
            ▼
          </span>
        )}
      </div>
      {item.bullets ? (
        <ul className="tm-topic-card__bullets">
          {item.bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      ) : (
        <div className="tm-topic-card__desc">{item.desc}</div>
      )}
      
      {item.dropdownList && expanded && (
        <div className="tm-topic-card__dropdown" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--grey-200)', animation: 'fadeIn 0.2s ease-out' }}>
          <ul style={{ listStyleType: 'none', padding: 0, margin: 0, fontSize: '13px', color: 'var(--grey-700)', display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
            {item.dropdownList.map((topic, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--crimson)' }}>•</span> {topic}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Phase Card ──────────────────────────────────────────────────────────────
function PhaseCard({ phase, index, isVisible, isLast }) {
  const trackRef = useRef(null);
  // Show navigation only when items are more than what fits (typically 3)
  const hasMore = phase.items && phase.items.length > 3;

  const scrollBy = (amount) => {
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <div
      className="tm-phase"
      style={{ '--delay': `${index * 90}ms` }}
      data-visible={isVisible}
    >
      <div className="tm-phase__num">{phase.num}</div>

      <div className="tm-phase__body">
        <div className="tm-phase__header">
          <div className="tm-phase__title">{phase.title}</div>
          <div className="tm-phase__dash"></div>
          <div className="tm-phase__tag">{phase.tag}</div>
        </div>

        {hasMore && (
          <div className="tm-phase__nav">
            <button
              className="tm-phase__nav-btn"
              onClick={() => scrollBy(-300)}
              aria-label="Previous cards"
            >
              &#8249;
            </button>
            <button
              className="tm-phase__nav-btn"
              onClick={() => scrollBy(300)}
              aria-label="Next cards"
            >
              &#8250;
            </button>
          </div>
        )}

        <div className="tm-phase__items" ref={trackRef}>
          {phase.items.map((item, j) => (
            <TopicCard key={j} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Removed StaircaseStep

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TrainingModule() {
  const [activeKey, setActiveKey] = useState('pinnacle');
  const [isVisible, setIsVisible] = useState(false);
  const [panelKey, setPanelKey] = useState('pinnacle');
  const sectionRef = useRef(null);

  const activePlan = CURRICULUM_PLANS[activeKey];

  // Intersection observer for section reveal
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Animate panel swap on plan change
  const handleSelect = (key) => {
    if (key === activeKey) return;
    setIsVisible(false);
    setTimeout(() => {
      setActiveKey(key);
      setPanelKey(key);
      setIsVisible(true);
    }, 220);
  };



  return (
    <section className="training fade-in-section" id="training" ref={sectionRef}>
      <div className="container">

        {/* ── Section Header ── */}
        <div className="training__header">
          <span className="section-label">Curriculum</span>
          <h2 className="section-title text-ink-900">The 3-Phase <span className="text-crimson">Training Module</span></h2>
          <p className="section-subtitle">
            One ladder, three levels. Pick the right starting point for your students -
            the curriculum adapts to where they are and where they need to go.
          </p>
        </div>

        {/* ── Pills Selector ── */}
        <div className="tm-pills">
          {PLAN_KEYS.map((key) => (
            <button
              key={key}
              className={`tm-pill ${key === activeKey ? 'tm-pill--active' : ''}`}
              onClick={() => handleSelect(key)}
            >
              {CURRICULUM_PLANS[key].tagline}
            </button>
          ))}
        </div>



        {/* ── Plan Detail Panel ── */}
        <div
          className={`tm-panel ${isVisible ? 'tm-panel--visible' : ''}`}
          key={panelKey}
        >
          <div className="tm-panel__head">
            <div>
              <h3 className="tm-panel__name">{activePlan.label}</h3>
              <p className="tm-panel__meta">{activePlan.meta}</p>
            </div>
          </div>

          {/* ── Phase Roadmap ── */}
          <div className="tm-roadmap">
            {activePlan.phases.map((phase, i) => (
              <PhaseCard
                key={`${panelKey}-${phase.num}`}
                phase={phase}
                index={i}
                isVisible={isVisible}
                isLast={i === activePlan.phases.length - 1}
              />
            ))}
          </div>

          {activePlan.addon && (
            <div className="addon-section" data-visible={isVisible} style={{ '--delay': `${activePlan.phases.length * 90}ms` }}>
               <div className="addon-block">
                 {activePlan.addon.label && <div className="addon-block-label">{activePlan.addon.label}</div>}
                 <div className="tm-phase__items tm-phase__items--addon">
                   {activePlan.addon.items.map((item, j) => (
                     <div key={j} className="tm-topic-card tm-topic-card--addon">
                        <span className="cc-badge">ADD-ON</span>
                        <div className="tm-topic-card__name">{item.title}</div>
                        {item.bullets && (
                          <ul className="tm-topic-card__bullets">
                            {item.bullets.map((b, i) => <li key={i}>{b}</li>)}
                          </ul>
                        )}
                     </div>
                   ))}
                 </div>
               </div>
            </div>
          )}


        </div>

      </div>
    </section>
  );
}
