import Link from 'next/link';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useAuth } from './AuthProvider';
import Breadcrumbs from './Breadcrumbs';
import Image from 'next/image';
import logo from '../utils/images/logo.png'; // Adjust the path as necessary
import styles from '../styles/Header.module.css';

export default function Header() {
  const { user, logout, cart } = useAuth() || {};
  const cartCount = (cart?.items || []).reduce((s, it) => s + (it.qty || 0), 0);

  return (
    <header className={styles.header}>
      <nav className="navbar navbar-expand-lg navbar-light bg-white">
        <div className="container">
          <Link href="/" legacyBehavior>
            <a className="navbar-brand d-flex align-items-center">
              {/* simple text logo; replace with image if available */}
              <Image src={logo} alt="Logo" style={{ height: 38, marginRight: 10,width:38,borderRadius:'50px' }} onError={(e)=>{e.currentTarget.style.display='none'}} />
              Timtom
            </a>
          </Link>

          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav">
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse justify-content-between" id="mainNav">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-3">
              <li className="nav-item"><Link className="nav-link" href="/men">MEN</Link></li>
              <li className="nav-item"><Link className="nav-link" href="/women">WOMEN</Link></li>
              <li className="nav-item"><Link className="nav-link" href="/kids">KIDS</Link></li>
              <li className="nav-item"><Link className="nav-link" href="/beauty">BEAUTY</Link></li>
              <li className="nav-item"><Link className="nav-link" href="/genz">GENZ</Link></li>
              <li className="nav-item"><Link className="nav-link text-danger" href="/studio">STUDIO</Link></li>
            </ul>

            <div className="d-flex align-items-center w-50 mx-3">
              <form className="w-100">
                <div className="input-group search-large">
                  <span className="input-group-text bg-white border-end-0" id="search-addon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#6c757d" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.415l-3.85-3.85zm-5.242 1.11a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/></svg>
                  </span>
                  <input className="form-control search-input border-start-0" type="search" placeholder="Search for products, brands and more" aria-label="Search" />
                </div>
              </form>
            </div>

            <div className="d-flex align-items-center nav-icons ms-3" style={{ flex: '0 0 auto' }}>
              <Link href="/cart" legacyBehavior>
                <a className="d-flex align-items-center text-decoration-none me-2 position-relative">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#212529" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                  </svg>
                  <span className="d-none d-lg-inline ms-1">Bag</span>
                  {cartCount > 0 && (
                    <span className="badge bg-danger text-white rounded-pill ms-2" style={{fontSize:'.7rem'}}>{cartCount}</span>
                  )}
                </a>
              </Link>

              {!user ? (
                <>
                  <Link href="/auth/login" legacyBehavior>
                    <a className="btn btn-sm btn-outline-secondary me-2 d-none d-md-inline">Login</a>
                  </Link>
                  <Link href="/auth/signup" legacyBehavior>
                    <a className="btn btn-sm btn-primary">Sign up</a>
                  </Link>
                </>
              ) : (
                <>
                  <div className="dropdown" >
                    <button
                      className="btn dropdown-toggle"
                      type="button"
                      id="dropdownMenuButton"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      Hi, {user.name || 'User'}
                    </button>
                    <ul className="dropdown-menu" aria-labelledby="dropdownMenuButton">
                      <li><Link className="dropdown-item" href="/profile">My Profile</Link></li>
                      <li><Link className="dropdown-item" href="/profile/orders">My Orders</Link></li>
                      <li>
                        <button className="dropdown-item text-danger" onClick={() => logout()}>
                          Logout
                        </button>
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* global breadcrumb inserted here so it shows on all pages */}
      <Breadcrumbs />
    </header>
  );
}
