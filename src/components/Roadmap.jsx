import { useEffect, useRef } from 'react';
import './Roadmap.css';

const ROADMAP_STEPS = [
  {
    id: 1,
    phase: 'Week 1–2',
    title: 'Onboarding & Assessment',
    desc: 'Diagnostic test, skill gap analysis, personalised learning plan setup.',
    icon: '🎯',
    color: '#6366f1',
  },
  {
    id: 2,
    phase: 'Month 1–2',
    title: 'Fundamentals — DSA & CP',
    desc: 'Data Structures, Algorithms, Competitive Programming patterns.',
    icon: '🧠',
    color: '#DC2626',
  },
  {
    id: 3,
    phase: 'Month 2–4',
    title: 'Dev, Systems & CS Core',
    desc: 'System Design (LLD+HLD), Full Stack Dev, OS, DBMS, Networks.',
    icon: '⚙️',
    color: '#059669',
  },
  {
    id: 4,
    phase: 'Month 4–5',
    title: 'Interview Mastery',
    desc: 'Mock interviews with FAANG engineers, resume reviews.',
    icon: '🏆',
    color: '#D97706',
  },
  {
    id: 5,
    phase: 'Month 5–6',
    title: 'Placement & Beyond',
    desc: 'Live hiring drives, direct referrals, offer negotiation.',
    icon: '🚀',
    color: '#7C3AED',
  },
];

// The 5 steps sit at evenly‑spaced X positions across a 1000‑wide viewBox.
// Odd steps (1,3,5) sit on the TOP row (y=120), even steps (2,4) on the BOTTOM row (y=380).
const VW = 1000;
const TOP_Y = 200;
const BOT_Y = 400;

function nodeX(idx) { return 100 + idx * 200; }
function nodeY(idx) { return idx % 2 === 0 ? TOP_Y : BOT_Y; }

// Build a smooth cubic‑bezier path through all 5 node centres.
function buildPath() {
  const pts = ROADMAP_STEPS.map((_, i) => ({ x: nodeX(i), y: nodeY(i) }));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const curr = pts[i];
    const next = pts[i + 1];
    const mx = (curr.x + next.x) / 2;
    // cubic bezier: control points hang vertically from midpoint
    d += ` C ${mx} ${curr.y}, ${mx} ${next.y}, ${next.x} ${next.y}`;
  }
  return d;
}

const PATH_D = buildPath();

export default function Roadmap() {
  const pathRef = useRef(null);
  const sectionRef = useRef(null);

  // Animate the path draw when section scrolls into view
  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          path.style.transition = 'stroke-dashoffset 2.4s cubic-bezier(0.4,0,0.2,1)';
          path.style.strokeDashoffset = '0';
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="roadmap" id="roadmap" ref={sectionRef}>
      <div className="container roadmap__container">
        <div className="roadmap__header">
          <span className="section-label">Your Journey</span>
          <h2 className="section-title">The AlgoUniversity Roadmap</h2>
          <p className="section-subtitle">
            From day one to your dream offer — a clear, structured path designed by FAANG engineers.
          </p>
        </div>

        {/* SVG Canvas — sits behind the cards */}
        <div className="roadmap__canvas-wrap">
          <svg
            className="roadmap__svg"
            viewBox={`0 0 ${VW} 600`}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#6366f1" />
                <stop offset="25%"  stopColor="#DC2626" />
                <stop offset="50%"  stopColor="#059669" />
                <stop offset="75%"  stopColor="#D97706" />
                <stop offset="100%" stopColor="#7C3AED" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Glow backing path */}
            <path
              d={PATH_D}
              fill="none"
              stroke="url(#pathGrad)"
              strokeWidth="10"
              strokeLinecap="round"
              opacity="0.25"
            />

            {/* Main animated path */}
            <path
              ref={pathRef}
              d={PATH_D}
              fill="none"
              stroke="url(#pathGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              filter="url(#glow)"
            />

            {/* Node circles */}
            {ROADMAP_STEPS.map((step, i) => (
              <g key={step.id}>
                <circle
                  cx={nodeX(i)}
                  cy={nodeY(i)}
                  r="22"
                  fill="white"
                  stroke={step.color}
                  strokeWidth="3"
                  filter="url(#glow)"
                />
                <text
                  x={nodeX(i)}
                  y={nodeY(i) + 6}
                  textAnchor="middle"
                  fontSize="18"
                  dominantBaseline="auto"
                >
                  {step.icon}
                </text>
              </g>
            ))}
          </svg>

          {/* Overlay cards — absolutely positioned to match node positions */}
          {ROADMAP_STEPS.map((step, i) => {
            const isTop = i % 2 === 0;
            // Convert from SVG coords (viewBox 0–1000) to % for responsive placement
            const leftPct = (nodeX(i) / VW) * 100;
            return (
              <div
                key={step.id}
                className={`roadmap__card roadmap__card--${isTop ? 'top' : 'bot'}`}
                style={{ left: `${leftPct}%`, '--accent': step.color }}
              >
                <div className="roadmap__card-phase" style={{ color: step.color }}>
                  {step.phase}
                </div>
                <h3 className="roadmap__card-title">{step.title}</h3>
                <p className="roadmap__card-desc">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
