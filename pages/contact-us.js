import Header from '../components/Header';
import Footer from '../components/Footer';
import styles from '../styles/ContactUs.module.css';

export default function ContactUs() {
  return (
    <>
      <Header />
      <div className={`container ${styles.contactUsContainer}`}>
        <h1 className="text-center my-4">Contact Us</h1>
        <form className={styles.contactForm}>
          <div className="mb-3">
            <label htmlFor="name" className="form-label">Name</label>
            <input type="text" className="form-control" id="name" placeholder="Your Name" />
          </div>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email</label>
            <input type="email" className="form-control" id="email" placeholder="Your Email" />
          </div>
          <div className="mb-3">
            <label htmlFor="message" className="form-label">Message</label>
            <textarea className="form-control" id="message" rows="4" placeholder="Your Message"></textarea>
          </div>
          <button type="submit" className="btn btn-primary">Send Message</button>
        </form>
      </div>
    </>
  );
}
