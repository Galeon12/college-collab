import { useState } from 'react';
import { FAQS } from '../data';
import { FiPlus } from 'react-icons/fi';
import { OrbitCircle, DotGrid, CodeSymbol } from './QuirkyBackgrounds';
import './FAQ.css';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <section className="faq" id="faq" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Quirky elements in side gutters */}
      <OrbitCircle size={140} className="faq__quirky-orbit" />
      <DotGrid className="faq__quirky-dots" />
      <CodeSymbol className="faq__quirky-code" color="#94a3b8">&#123; &#125;</CodeSymbol>
      <div className="container">
        <div className="faq__header">
          <span className="section-label">FAQ</span>
          <h2 className="section-title text-ink-900">Frequently Asked <span className="text-crimson">Questions</span></h2>
          <p className="section-subtitle">
            Everything you need to know about partnering with AlgoUniversity.
          </p>
        </div>

        <div className="faq__list">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className={`faq__item ${openIndex === i ? 'open' : ''}`}
            >
              <button className="faq__question" onClick={() => toggle(i)}>
                {faq.question}
                <span className="faq__icon"><FiPlus /></span>
              </button>
              <div className="faq__answer">
                <p className="faq__answer-text">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
