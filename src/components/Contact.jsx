import { useState } from 'react';
import { BRAND } from '../data';
import { FiMail, FiPhone, FiMapPin } from 'react-icons/fi';
import emailjs from '@emailjs/browser';
import './Contact.css';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    college: '',
    email: '',
    phone: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState(''); // 'success' or 'error'

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please sign up or log in first to submit your consultation request!');
      window.dispatchEvent(new CustomEvent('openAuthModal', { detail: { mode: 'signup' } }));
      return;
    }

    setIsSubmitting(true);
    setStatusMsg('');
    setStatusType('');

    try {
      // 1. Save to MongoDB via Backend API
      const response = await fetch('http://localhost:5000/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 2. Send Email via EmailJS
        try {
          await emailjs.send(
            import.meta.env.VITE_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID',
            import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID',
            {
              user_name: formData.name,
              user_email: formData.email,
              college: formData.college,
              phone: formData.phone,
              message: formData.message,
            },
            import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY'
          );
        } catch (emailError) {
          console.error("EmailJS sending failed (but DB save succeeded):", emailError);
        }

        setStatusType('success');
        setStatusMsg('Thank you for your interest! Your application has been submitted, and our team will get back to you within 24 hours.');
        setFormData({ name: '', college: '', email: '', phone: '', message: '' });
      } else {
        setStatusType('error');
        setStatusMsg(data.message || 'Failed to submit application. Please try again.');
      }
    } catch (error) {
      console.error('Submission error:', error);
      setStatusType('error');
      setStatusMsg('Could not connect to the server. Please check if the backend is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="contact" id="contact">
      <div className="container">
        <div className="contact__inner">
          <div className="contact__content">
            <span className="contact__label">Get In Touch</span>
            <h2 className="contact__title">
              Let's Transform Your<br />Campus Together
            </h2>
            <p className="contact__desc">
              Ready to empower your students with industry-ready skills? 
              Reach out to us and we'll schedule a consultation tailored to your college's needs.
            </p>

            <div className="contact__info">
              <div className="contact__info-item">
                <div className="contact__info-icon"><FiMail /></div>
                <div className="contact__info-text">
                  <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
                </div>
              </div>
              <div className="contact__info-item">
                <div className="contact__info-icon"><FiPhone /></div>
                <div className="contact__info-text">
                  <a href={`tel:${BRAND.phone}`}>{BRAND.phone}</a>
                </div>
              </div>
              <div className="contact__info-item">
                <div className="contact__info-icon"><FiMapPin /></div>
                <div className="contact__info-text">{BRAND.address}</div>
              </div>
            </div>
          </div>

          <div className="contact__form-wrap">
            <form className="contact__form" onSubmit={handleSubmit}>
              <h3 className="contact__form-title">Schedule a Consultation</h3>

              <div className="contact__form-group">
                <label className="contact__form-label" htmlFor="contact-name">Your Name</label>
                <input
                  id="contact-name"
                  className="contact__form-input"
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="contact__form-group">
                <label className="contact__form-label" htmlFor="contact-college">College Name</label>
                <input
                  id="contact-college"
                  className="contact__form-input"
                  type="text"
                  name="college"
                  placeholder="Enter your college name"
                  value={formData.college}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="contact__form-group">
                <label className="contact__form-label" htmlFor="contact-email">Email</label>
                <input
                  id="contact-email"
                  className="contact__form-input"
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="contact__form-group">
                <label className="contact__form-label" htmlFor="contact-phone">Phone</label>
                <input
                  id="contact-phone"
                  className="contact__form-input"
                  type="tel"
                  name="phone"
                  placeholder="+91 XXXXX XXXXX"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="contact__form-group">
                <label className="contact__form-label" htmlFor="contact-message">Message</label>
                <textarea
                  id="contact-message"
                  className="contact__form-textarea"
                  name="message"
                  placeholder="Tell us about your requirements..."
                  value={formData.message}
                  onChange={handleChange}
                />
              </div>
              {statusMsg && (
                <div className={`contact__form-status contact__form-status--${statusType}`}>
                  {statusMsg}
                </div>
              )}

              <button 
                type="submit" 
                className="contact__form-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>

        <div className="contact__footer">

          <div className="contact__copyright">
            © {new Date().getFullYear()} AlgoUniversity. All rights reserved. Backed by Y Combinator (W21).
          </div>
        </div>
      </div>
    </section>
  );
}
