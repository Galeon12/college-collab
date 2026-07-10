import './QuirkyBackgrounds.css';

/**
 * Animated circle with a dot orbiting the perimeter.
 * Pure CSS animation - no JS needed.
 */
function OrbitCircle({ size = 160, className = '' }) {
  const r = (size / 2) - 8; // leave room for the dot
  return (
    <div className={`quirky-orbit ${className}`} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} fill="none" width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} stroke="#FECACA" strokeWidth="1.2" />
      </svg>
      {/* Orbiting dot */}
      <div className="quirky-orbit__dot" style={{
        width: size,
        height: size,
        // The dot orbits around the center
      }}>
        <span className="quirky-orbit__dot-point" />
      </div>
    </div>
  );
}

/**
 * Dot grid pattern
 */
function DotGrid({ className = '' }) {
  return <div className={`quirky-dotgrid ${className}`} />;
}

/**
 * Hexagon cluster
 */
function Hexagons({ className = '' }) {
  return (
    <svg className={`quirky-hexagons ${className}`} viewBox="0 0 160 240" fill="none">
      <path d="M80 16 L128 40 L128 88 L80 112 L32 88 L32 40 Z" stroke="#cbd5e1" strokeWidth="1.8" />
      <path d="M80 96 L128 120 L128 168 L80 192 L32 168 L32 120 Z" stroke="#cbd5e1" strokeWidth="1.8" />
      <path d="M128 56 L176 80 L176 128 L128 152 L80 128 L80 80 Z" stroke="#cbd5e1" strokeWidth="1.8" />
    </svg>
  );
}

/**
 * Code symbol
 */
function CodeSymbol({ children, className = '', color = '#DC2626' }) {
  return (
    <span className={`quirky-code ${className}`} style={{ color }}>
      {children}
    </span>
  );
}

/**
 * Cross / Plus sign
 */
function CrossMark({ className = '' }) {
  return (
    <svg className={`quirky-cross ${className}`} viewBox="0 0 40 40" fill="none" width="32" height="32">
      <line x1="20" y1="4" x2="20" y2="36" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="20" x2="36" y2="20" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export { OrbitCircle, DotGrid, Hexagons, CodeSymbol, CrossMark };

export default function QuirkyBackgrounds() {
  // This component is now empty - quirky elements are embedded in individual sections
  return null;
}
