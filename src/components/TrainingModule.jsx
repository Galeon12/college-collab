import { useState, useEffect, useRef } from 'react';
import { CURRICULUM_PLANS, PLAN_KEYS } from '../data';
import './TrainingModule.css';

// ─── Phase Card ──────────────────────────────────────────────────────────────
function PhaseCard({ phase, index, isVisible }) {
  const [start, setStart] = useState(0);
  const hasMore = phase.items.length > 3;
  const canPrev = start > 0;
  const canNext = start + 3 < phase.items.length;
  const visible = phase.items.slice(start, start + 3);
  const totalPages = Math.ceil(phase.items.length / 3);
  const currentPage = Math.floor(start / 3) + 1;

  // Reset when phase changes (key-based remount handles this automatically,
  // but guard anyway)
  useEffect(() => { setStart(0); }, [phase.num]);

  return (
    <div
      className="tm-phase"
      style={{ '--delay': `${index * 90}ms` }}
      data-visible={isVisible}
    >
      <div className="tm-phase__connector">
        <div className="tm-phase__num">{phase.num}</div>
        {index < 2 && <div className="tm-phase__line" />}
      </div>

      <div className="tm-phase__body">
        <div className="tm-phase__header">
          <h3 className="tm-phase__title">{phase.title}</h3>
          <span className="tm-phase__tag">{phase.tag}</span>

          {hasMore && (
            <div className="tm-phase__nav">
              <button
                className={`tm-phase__nav-btn ${!canPrev ? 'tm-phase__nav-btn--disabled' : ''}`}
                onClick={() => setStart(s => Math.max(0, s - 3))}
                disabled={!canPrev}
                aria-label="Previous cards"
              >
                &#8249;
              </button>
              <span className="tm-phase__nav-count">{currentPage} / {totalPages}</span>
              <button
                className={`tm-phase__nav-btn ${!canNext ? 'tm-phase__nav-btn--disabled' : ''}`}
                onClick={() => setStart(s => Math.min(phase.items.length - 3, s + 3))}
                disabled={!canNext}
                aria-label="Next cards"
              >
                &#8250;
              </button>
            </div>
          )}
        </div>

        <div className="tm-phase__items">
          {visible.map((item, j) => (
            <div key={start + j} className="tm-topic-card">
              <span className="tm-topic-card__num">{String(start + j + 1).padStart(2, '0')}</span>
              <div className="tm-topic-card__name">{item.title}</div>
              <div className="tm-topic-card__desc">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Staircase Step ───────────────────────────────────────────────────────────
function StaircaseStep({ plan, isActive, onClick, heightPct, muted }) {
  return (
    <button
      className={`tm-step tm-step--${plan.key} ${isActive ? 'tm-step--active' : ''} ${muted ? 'tm-step--muted' : ''}`}
      style={{ '--h': `${heightPct}%` }}
      onClick={onClick}
      aria-pressed={isActive}
    >
      <div className="tm-step__glass">
        <span className="tm-step__year">{plan.tagline}</span>
        <span className="tm-step__name">{plan.label}</span>
        <span className="tm-step__hint">{plan.description}</span>
      </div>
    </button>
  );
}

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

  // Heights for visual staircase hierarchy
  const heights = { pinnacle: 52, nexus: 76, apex: 100 };

  return (
    <section className="training" id="training" ref={sectionRef}>
      <div className="container">

        {/* ── Section Header ── */}
        <div className="training__header">
          <span className="section-label">Curriculum</span>
          <h2 className="section-title">The 3-Phase Training Module</h2>
          <p className="section-subtitle">
            One ladder, three levels. Pick the right starting point for your students —
            the curriculum adapts to where they are and where they need to go.
          </p>
        </div>

        {/* ── Staircase ── */}
        <div className={`tm-staircase ${activeKey ? 'tm-staircase--has-active' : ''}`}>
          {PLAN_KEYS.map((key) => (
            <StaircaseStep
              key={key}
              plan={CURRICULUM_PLANS[key]}
              isActive={key === activeKey}
              muted={activeKey !== null && key !== activeKey}
              heightPct={heights[key]}
              onClick={() => handleSelect(key)}
            />
          ))}
        </div>
        <p className="tm-staircase__caption">Click a step to explore that plan's curriculum.</p>



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
              />
            ))}
          </div>


        </div>

      </div>
    </section>
  );
}
