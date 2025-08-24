import Header from '../components/Header';
import Footer from '../components/Footer';
import styles from '../styles/PrivacyPolicy.module.css';

export default function PrivacyPolicy() {
  return (
    <>
      <Header />
      <div className={`container ${styles.privacyContainer}`}>
        <h1 className="text-center my-4">Privacy Policy</h1>
        <p className={styles.privacyText}>At DemoShop, we value your privacy. This policy outlines how we handle your data.</p>
        <ul className={styles.privacyList}>
          <li>We do not share your personal information with third parties.</li>
          <li>Your data is stored securely and used only for order processing.</li>
          <li>You can request data deletion by contacting support.</li>
        </ul>
      </div>
      <Footer />
    </>
  );
}
