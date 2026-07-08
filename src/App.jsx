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
  Contact
} from './components';

export default function App() {
  return (
    <>
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
    </>
  );
}
