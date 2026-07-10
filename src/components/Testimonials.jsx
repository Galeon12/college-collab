import { useState, useRef, useEffect, useCallback } from 'react';
import { TESTIMONIALS } from '../data';
import './Testimonials.css';

export default function Testimonials() {
  const [activeDot, setActiveDot] = useState(0);
  const trackRef = useRef(null);

  // Scroll to card by index
  const scrollToCard = useCallback((index) => {
    setActiveDot(index);
    if (trackRef.current) {
      const track = trackRef.current;
      const card = track.children[index];
      if (card) {
        track.scrollTo({
          left: card.offsetLeft - track.offsetLeft,
          behavior: 'smooth',
        });
      }
    }
  }, []);

  // Update dot on scroll - uses scroll progress to determine which card is "active"
  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const totalScrollable = track.scrollWidth - track.clientWidth;
    if (totalScrollable <= 0) return;

    // Find the card closest to the left edge of the visible area
    let closestIndex = 0;
    let minDistance = Infinity;

    Array.from(track.children).forEach((child, index) => {
      const childCenter = child.offsetLeft - track.offsetLeft + child.offsetWidth / 2;
      const viewCenter = track.scrollLeft + track.clientWidth / 2;
      const distance = Math.abs(childCenter - viewCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    // If scrolled to end, force last dot active
    if (track.scrollLeft >= totalScrollable - 4) {
      closestIndex = TESTIMONIALS.length - 1;
    }

    setActiveDot(closestIndex);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener('scroll', handleScroll, { passive: true });
    return () => track.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <section className="testimonials" id="testimonials">
      <div className="container">
        <div className="testimonials__header">
          <span className="section-label">Testimonials</span>
          <h2 className="section-title text-ink-900">What Our <span className="text-crimson">Students Say</span></h2>
          <p className="section-subtitle">
            Hear from students who transformed their careers through our programme.
          </p>
        </div>

        <div className="testimonials__carousel">
          <div
            className="testimonials__track"
            ref={trackRef}
          >
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="testimonials__card">
                <div className="testimonials__card-header">
                  <div className="testimonials__avatar">{t.initials}</div>
                  <div>
                    <div className="testimonials__name">{t.name}</div>
                    <div className="testimonials__role">Placed at {t.company}</div>
                  </div>
                </div>
                <p className="testimonials__text">
                  <span className="testimonials__quote-icon">"</span>
                  {t.text}
                </p>
                <span className="testimonials__package">
                  CTC: {t.package}
                </span>
              </div>
            ))}
          </div>

          <div className="testimonials__dots">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                className={`testimonials__dot ${activeDot === i ? 'active' : ''}`}
                onClick={() => scrollToCard(i)}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
