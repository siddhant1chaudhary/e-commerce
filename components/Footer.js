import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="site-footer bg-light border-top mt-5">
      <div className="container py-5">
        <div className="row gy-4">
          <div className="col-6 col-md-3">
            <h6 className="text-uppercase fw-bold small">Online Shopping</h6>
            <ul className="list-unstyled mt-3">
              <li><Link href="/men" className="text-muted text-decoration-none">Men</Link></li>
              <li><Link href="/women" className="text-muted text-decoration-none">Women</Link></li>
              <li><Link href="/kids" className="text-muted text-decoration-none">Kids</Link></li>
              <li><Link href="/beauty" className="text-muted text-decoration-none">Beauty</Link></li>
              <li><Link href="/genz" className="text-muted text-decoration-none">GenZ</Link></li>
            </ul>
          </div>

          <div className="col-6 col-md-3">
            <h6 className="text-uppercase fw-bold small">Customer Policies</h6>
            <ul className="list-unstyled mt-3">
              <li><Link href="/contact-us" className="text-muted text-decoration-none">Contact Us</Link></li>
              <li><Link href="/faq" className="text-muted text-decoration-none">FAQ</Link></li>
              <li><a href="#" className="text-muted text-decoration-none">T&C</a></li>
              <li><Link href="/terms-of-use" className="text-muted text-decoration-none">Terms Of Use</Link></li>
              {/* <li><a href="#" className="text-muted text-decoration-none">Track Orders</a></li>
              <li><a href="#" className="text-muted text-decoration-none">Shipping</a></li>
              <li><a href="#" className="text-muted text-decoration-none">Cancellation</a></li>
              <li><a href="#" className="text-muted text-decoration-none">Returns</a></li> */}
              <li><Link href="/privacy-policy" className="text-muted text-decoration-none">Privacy policy</Link></li>
            </ul>
          </div>

          <div className="col-12 col-md-4">
            <h6 className="text-uppercase fw-bold small">Experience App on Mobile</h6>
            <div className="d-flex align-items-center gap-2 mt-3">
              <a href="#" aria-label="Google Play" className="d-inline-block">
                <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play" style={{height:42}} />
              </a>
              <a href="#" aria-label="App Store" className="d-inline-block">
                <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="App Store" style={{height:42}} />
              </a>
            </div>

            <div className="mt-4">
              <h6 className="text-uppercase fw-bold small">Keep in touch</h6>
              <div className="d-flex gap-2 mt-2">
                <a href="#" className="social-icon" aria-label="facebook">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#6c757d"><path d="M22 12.07C22 6.55 17.52 2 12 2S2 6.55 2 12.07C2 17.1 5.66 21.23 10.44 22v-7.03H7.9v-2.9h2.54V9.41c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.45h-1.25c-1.23 0-1.61.77-1.61 1.56v1.88h2.74l-.44 2.9h-2.3V22C18.34 21.23 22 17.1 22 12.07z"/></svg>
                </a>
                <a href="#" className="social-icon" aria-label="twitter">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#6c757d"><path d="M22 5.92c-.63.28-1.3.48-2 .57.72-.43 1.27-1.12 1.53-1.94-.67.4-1.42.69-2.22.85C18.9 4.7 17.93 4 16.79 4c-1.56 0-2.82 1.26-2.82 2.82 0 .22.02.44.07.65C11 7.3 8.1 5.7 6 3.12c-.24.42-.38.9-.38 1.42 0 .98.5 1.84 1.26 2.35-.47 0-.91-.14-1.3-.36v.04c0 1.37.98 2.51 2.28 2.77-.24.07-.5.11-.76.11-.19 0-.38-.02-.56-.05.37 1.15 1.44 1.98 2.71 2.01C8.3 15.2 6.9 15.86 5.36 15.86c-.28 0-.55-.02-.82-.05C6 17.04 7.44 17.8 9.06 17.8c4.33 0 6.7-3.38 6.7-6.31v-.29c.46-.33.86-.73 1.18-1.18-.42.19-.88.33-1.35.4.39-.23.69-.6.83-1.04z"/></svg>
                </a>
                <a href="#" className="social-icon" aria-label="youtube">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#6c757d"><path d="M23.5 6.2s-.2-1.6-.82-2.3c-.78-.82-1.66-.82-2.06-.86C16.9 2.6 12 2.6 12 2.6h-.02s-4.9 0-8.6.45c-.4.04-1.28.04-2.06.86C.7 4.6.5 6.2.5 6.2S.18 8 .18 9.8v.4C.18 12 .18 13.8.18 13.8s.2 1.6.82 2.3c.78.82 1.8.79 2.26.88 1.64.22 6.98.4 6.98.4s4.9-.02 8.6-.45c.4-.04 1.28-.04 2.06-.86.62-.68.82-2.3.82-2.3s.32-1.8.32-3.6v-.4c0-1.8-.32-3.6-.32-3.6zM9.75 14.02V7.98l5.2 3.02-5.2 3.02z"/></svg>
                </a>
                <a href="#" className="social-icon" aria-label="instagram">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#6c757d"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 6.2A3.8 3.8 0 1 0 15.8 12 3.8 3.8 0 0 0 12 8.2zM18.4 5.6a1.12 1.12 0 1 0 1.12 1.12A1.12 1.12 0 0 0 18.4 5.6z"/></svg>
                </a>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-2 d-flex flex-column align-items-start">
            <div className="trust py-2">
              <div className="d-flex align-items-center gap-2 mb-3">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="#6c757d"><path d="M12 1l3 6 6 .5-4.5 3.8 1.5 6.7L12 15.8 5 18.9l1.5-6.7L2 8.4 8 7.9 12 1z"/></svg>
                <div>
                  <div className="fw-bold">100% ORIGINAL</div>
                  <div className="text-muted small">guarantee for all products</div>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="#6c757d"><path d="M21 10v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7"/></svg>
                <div>
                  <div className="fw-bold">Return within 14 days</div>
                  <div className="text-muted small">of receiving your order</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <hr className="my-4" />

        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center small text-muted">
          <div>© {new Date().getFullYear()} DemoShop. All rights reserved.</div>
          <div>Made with ♥ — Demo project</div>
        </div>
      </div>
    </footer>
  );
}
