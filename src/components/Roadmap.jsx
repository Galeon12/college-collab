import { useEffect, useRef } from 'react';
import { FiCalendar, FiClock, FiUsers } from 'react-icons/fi';
import { OrbitCircle, CodeSymbol } from './QuirkyBackgrounds';
import './Roadmap.css';

const ROADMAP_STEPS = [
  {
    id: 1,
    title: '1. Onboarding',
    desc: 'Orientation, platform setup, and initial assessments.',
    icon: '👋',
    color: '#3b82f6',
  },
  {
    id: 2,
    title: '2. Fundamentals - DSA & CP',
    desc: 'Data Structures, Algorithms, Competitive Programming, dsa.',
    icon: '🧠',
    color: '#ef4444',
  },
  {
    id: 3,
    title: '3. Weekly Problem Bunch',
    desc: 'A problem bunch after every class followed by doubt sessions to concrete your concepts.',
    icon: '💻',
    color: '#6366f1',
  },
  {
    id: 4,
    title: '4. Coding Round Simulations',
    desc: 'Coding-round simulations every 2 weeks that mirror the coding rounds of top-tech companies.',
    icon: '⚙️',
    color: '#f97316',
  },
  {
    id: 5,
    title: '5. Full Stack Development & System Design',
    desc: 'Build industry-level capstone project',
    icon: '📚',
    color: '#22c55e',
  },
  {
    id: 6,
    title: '6. CS Fundamentals',
    desc: 'Operating Systems, DBMS, Computer Networks, and Object-Oriented Programming.',
    icon: '🖥️',
    color: '#10b981',
  },
  {
    id: 7,
    title: '7. Interview Mastery',
    desc: 'Mock interviews with FAANG engineers, company specific PYQs, resume reviews.',
    icon: '🚀',
    color: '#8b5cf6',
  },
  {
    id: 8,
    title: '8. Placements',
    desc: 'Dedicated placement assistance, resume building, and profile optimization.',
    icon: '💼',
    color: '#ec4899',
  },
  {
    id: 9,
    title: '9. Get A SDE Role',
    desc: 'Live hiring drives, direct referrals, offer negotiation.',
    icon: '🏆',
    color: '#06b6d4',
  },
];

// The 5 steps sit at evenly‑spaced X positions across a 1000‑wide viewBox.
// Odd steps (1,3,5) sit on the TOP row (y=120), even steps (2,4) on the BOTTOM row (y=380).
const VW = 1880;
const TOP_Y = 200;
const BOT_Y = 400;

function nodeX(idx) { return 140 + idx * 200; }
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
    <section className="roadmap fade-in-section" id="roadmap" ref={sectionRef} style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Quirky elements */}
      <OrbitCircle size={280} className="roadmap__quirky-orbit" />
      <CodeSymbol className="roadmap__quirky-angle" color="#DC2626">&lt;/&gt;</CodeSymbol>
      <CodeSymbol className="roadmap__quirky-curly" color="#94a3b8">&#123; &#125;</CodeSymbol>
      <div className="container roadmap__container">
        <div className="roadmap__header">
          <span className="section-label">Your Journey</span>
          <h2 className="section-title text-ink-900">The AlgoUniversity <span className="text-crimson">Roadmap</span></h2>
          <p className="section-subtitle">
            From day one to your dream offer - a clear, structured path designed by FAANG engineers.
          </p>

          {/* ── Highlights ── */}
          <div className="roadmap-highlights">
            <div className="roadmap-highlight">
              <FiCalendar className="roadmap-highlight-icon" />
              <span className="roadmap-highlight-text">Training Program</span>
            </div>
            <div className="roadmap-highlight">
              <FiClock className="roadmap-highlight-icon" />
              <span className="roadmap-highlight-text">Access to Contests</span>
            </div>
            <div className="roadmap-highlight">
              <FiUsers className="roadmap-highlight-icon" />
              <span className="roadmap-highlight-text">Access to Hiring Partners</span>
            </div>
          </div>
        </div>

        {/* SVG Canvas - sits behind the cards */}
        <div className="roadmap__canvas-wrap">
          <svg
            className="roadmap__svg"
            viewBox={`0 0 ${VW} 600`}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="16%" stopColor="#ef4444" />
                <stop offset="33%" stopColor="#f97316" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="66%" stopColor="#22c55e" />
                <stop offset="83%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#8b5cf6" />
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

          {/* Overlay cards - absolutely positioned to match node positions */}
          {ROADMAP_STEPS.map((step, i) => {
            const isTop = i % 2 === 0;
            // Convert from SVG coords (viewBox 0-1000) to % for responsive placement
            const leftPct = (nodeX(i) / VW) * 100;
            return (
              <div
                key={step.id}
                className={`roadmap__card roadmap__card--${isTop ? 'top' : 'bot'}`}
                style={{ left: `${leftPct}%`, '--accent': step.color }}
              >
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
