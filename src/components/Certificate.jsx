import './Certificate.css';

export default function Certificate() {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="certificate" id="certificate">
      <div className="container certificate__container">

        {/* Left Side: Content */}
        <div className="certificate__content">
          <span className="section-label">Recognition</span>
          <h2 className="section-title text-ink-900">Certificate of <span className="text-crimson">Externship</span></h2>
          <p className="section-subtitle">
            Every student who successfully completes the AlgoUniversity training programme receives an
            industry-recognised Certificate of Externship. This credential signals to top employers that
            you have undergone rigorous, FAANG-level technical training and are ready to contribute from day one.
          </p>
          <button className="certificate__cta" onClick={() => scrollTo('contact')}>
            Get Certified
          </button>
        </div>

        {/* Right Side: Visual */}
        <div className="certificate__visual">
          <div className="certificate__glow" />
          <div className="certificate__image-wrapper">
            <img
              src="/certificate.png"
              alt="AlgoUniversity Certificate of Externship"
              className="certificate__img"
            />
          </div>
        </div>

      </div>
    </section>
  );
}
