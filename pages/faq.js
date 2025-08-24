import Header from '../components/Header';
import Footer from '../components/Footer';
import styles from '../styles/FAQ.module.css';

export default function FAQ() {
  return (
    <>
      <Header />
      <div className={`container ${styles.faqContainer}`}>
        <h1 className="text-center my-4">Frequently Asked Questions</h1>
        <div className={styles.faqItem}>
          <h5>What is DemoShop?</h5>
          <p>DemoShop is an online shopping platform offering a wide range of products.</p>
        </div>
        <div className={styles.faqItem}>
          <h5>How can I track my order?</h5>
          <p>You can track your order using the tracking link provided in your email.</p>
        </div>
        <div className={styles.faqItem}>
          <h5>What is the return policy?</h5>
          <p>Returns are accepted within 14 days of receiving your order.</p>
        </div>
      </div>
      <Footer />
    </>
  );
}
