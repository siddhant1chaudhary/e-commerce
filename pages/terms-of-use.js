import Header from '../components/Header';
import Footer from '../components/Footer';
import styles from '../styles/TermsOfUse.module.css';

export default function TermsOfUse() {
  return (
    <>
      <Header />
      <div className={`container ${styles.termsContainer}`}>
        <h1 className="text-center my-4">Terms of Use</h1>
        <p className={styles.termsText}>By using TimTom, you agree to our terms and conditions. Please read them carefully before making a purchase.</p>
        <ul className={styles.termsList}>
          <li>All sales are final unless stated otherwise.</li>
          <li>TimTom reserves the right to modify these terms at any time.</li>
          <li>Users must provide accurate information during checkout.</li>
        </ul>
      </div>
      <Footer />
    </>
  );
}
