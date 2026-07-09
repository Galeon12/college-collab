import {
  Navbar,
  Hero,
  StatsBar,
  YCombinator,
  Team,
  TrainingModule,
  Roadmap,
  DeliveryModes,
  KeyFeatures,
  Placements,
  Testimonials,
  PricingPlans,
  Certificate,
  FAQ,
  Contact,
  QuirkyBackgrounds
} from './components';
import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target); // once visible, stop watching
        }
      });
    }, { rootMargin: '80px', threshold: 0 });

    // Observe any matching element
    const observe = (el) => {
      if (!el.classList.contains('is-visible')) io.observe(el);
    };

    // Initial pass
    const selector = '.fade-in-section, .animate-on-scroll';
    document.querySelectorAll(selector).forEach(observe);

    // Watch for new elements being added to the DOM (React async renders)
    const mo = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          if (node.matches?.(selector)) observe(node);
          node.querySelectorAll?.(selector).forEach(observe);
        });
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // Safety net: re-query after a short delay
    const timer = setTimeout(() => {
      document.querySelectorAll(selector).forEach(observe);
    }, 500);

    return () => {
      io.disconnect();
      mo.disconnect();
      clearTimeout(timer);
    };
  }, []);

  return (
    <div style={{ position: 'relative', overflowX: 'clip' }}>
      <QuirkyBackgrounds />
      <Navbar />
      <main>
        <Hero />
        <StatsBar />
        <Team />
        <TrainingModule />
        <Roadmap />
        <DeliveryModes />
        <KeyFeatures />
        <Placements />
        <Testimonials />
        <PricingPlans />
        <Certificate />
        <FAQ />
        <YCombinator />
        <Contact />
      </main>
    </div>
  );
}
