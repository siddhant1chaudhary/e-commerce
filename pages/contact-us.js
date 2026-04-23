import { useState } from 'react';
import Header from '../components/Header';
import { useToast } from '../components/ToastProvider';
import styles from '../styles/ContactUs.module.css';

export default function ContactUs() {
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ name, email, message })
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast?.show({ type: 'error', message: data.error || 'Could not send message' });
        return;
      }
      toast?.show({ type: 'success', message: 'Message sent. We will get back to you soon.' });
      setName('');
      setEmail('');
      setMessage('');
    } catch {
      toast?.show({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Header />
      <div className={`container ${styles.contactUsContainer}`}>
        <h1 className="text-center my-4">Contact Us</h1>
        <form className={styles.contactForm} onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="name" className="form-label">Name</label>
            <input
              type="text"
              className="form-control"
              id="name"
              name="name"
              placeholder="Your Name"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              maxLength={200}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              id="email"
              name="email"
              placeholder="Your Email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="message" className="form-label">Message</label>
            <textarea
              className="form-control"
              id="message"
              name="message"
              rows="4"
              placeholder="Your Message"
              value={message}
              onChange={(ev) => setMessage(ev.target.value)}
              maxLength={10000}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send Message'}
          </button>
        </form>
      </div>
    </>
  );
}
