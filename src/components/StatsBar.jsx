import { useEffect, useRef, useState } from 'react';
import { STATS } from '../data';
import './StatsBar.css';

function useCountUp(target, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const numericTarget = parseFloat(target.replace(/[^0-9.]/g, '')) || 0;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * numericTarget));
      if (progress < 1) requestAnimationFrame(step);
      else setCount(numericTarget);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return count;
}

function StatCard({ stat, index, visible }) {
  const rawNum = parseFloat(stat.value.replace(/[^0-9.]/g, '')) || 0;
  const count = useCountUp(stat.value, 1800 + index * 200, visible);
  const prefix = stat.value.match(/^[^0-9]*/)?.[0] || '';
  const suffix = stat.value.replace(/^[^0-9]*[\d.]+/, '');

  return (
    <div className="stats-bar__item" style={{ animationDelay: `${index * 0.12}s` }}>
      <div className="stats-bar__value">
        {prefix}{rawNum % 1 !== 0 && !stat.value.includes('.') ? count : (Number.isInteger(rawNum) ? count : count.toFixed(1))}{suffix}
      </div>
      <div className="stats-bar__label">{stat.label}</div>
    </div>
  );
}

export default function StatsBar() {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="stats-bar" ref={ref}>
      <div className="container stats-bar__inner">
        {STATS.map((stat, i) => (
          <StatCard key={i} stat={stat} index={i} visible={visible} />
        ))}
      </div>
    </section>
  );
}
