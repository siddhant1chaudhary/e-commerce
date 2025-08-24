import Header from '../components/Header';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from '../styles/Profile.module.css';

export default function Profile() {
  return (
    <>
      <Header />
      <div className={`container ${styles.profileContainer}`}>
        <h1 className="text-center my-4">My Profile</h1>
        <div className="card mx-auto" style={{ maxWidth: '600px' }}>
          <div className="card-body">
            <h5 className="card-title">John Doe</h5>
            <p className="card-text">Email: johndoe@example.com</p>
            <p className="card-text">Phone: +1234567890</p>
            <p className="card-text">Address: 123 Main Street, City, Country</p>
            <button className="btn btn-primary">Edit Profile</button>
          </div>
        </div>
      </div>
    </>
  );
}
