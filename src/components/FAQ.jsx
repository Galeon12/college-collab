import { useState } from 'react';
import { FAQS } from '../data';
import './FAQ.css';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <section className="faq" id="faq">
      <div className="container">
        <div className="faq__header">
          <span className="section-label">FAQ</span>
          <h2 className="section-title">Frequently Asked Questions</h2>
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
                <span className="faq__icon">+</span>
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
