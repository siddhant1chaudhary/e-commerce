import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import { useAuth } from '../components/AuthProvider';
import { useToast } from '../components/ToastProvider';
import Link from 'next/link';
import { useRouter } from 'next/router';

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[]\/+^])/g,'\\$1') + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

export default function CheckoutPage() {
  const { cart, refreshCart } = useAuth() || {};
  const [localCart, setLocalCart] = useState(cart || null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState(null);
  const [shipping, setShipping] = useState({ name: '', phone: '', address: '' });
  const toast = useToast();
  const router = useRouter();

  useEffect(() => { setLocalCart(cart || null); }, [cart]);

  useEffect(() => {
    // ensure we have latest cart on mount
    refreshCart?.();
  }, [refreshCart]);

  const subtotal = useMemo(() => (localCart?.items || []).reduce((s,i)=> s + ((Number(i.price)||0)*(Number(i.qty)||0)), 0), [localCart]);
  const discount = couponResult?.discount || 0;
  const total = Math.max(0, subtotal - discount);

  async function applyCoupon() {
    if (!couponCode) { setCouponResult(null); return; }
    setApplying(true);
    try {
      const res = await fetch('/api/checkout/apply-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponCode, cartTotal: subtotal })
      });
      if (!res.ok) {
        const e = await res.json().catch(()=>({}));
        throw new Error(e.error || 'Coupon invalid');
      }
      const data = await res.json();
      setCouponResult(data);
      toast?.show({ type: 'success', message: `Coupon applied: -₹${data.discount}` });
    } catch (e) {
      setCouponResult(null);
      toast?.show({ type: 'error', message: e.message || 'Coupon apply failed' });
    } finally {
      setApplying(false);
    }
  }

  // updated: save payload and go to payment page
  function proceedToPayment() {
    if (!localCart || !localCart.items || localCart.items.length === 0) {
      toast?.show({ type: 'error', message: 'Cart is empty' }); return;
    }
    if (!shipping.name || !shipping.phone || !shipping.address) {
      toast?.show({ type: 'error', message: 'Please fill shipping details' }); return;
    }

    // Save checkout payload to sessionStorage so payment page can access it
    try {
      if (typeof window !== 'undefined') {
        const payload = {
          shipping,
          couponCode: couponResult?.coupon?.code || couponCode || null,
          subtotal,
          discount,
          total
        };
        sessionStorage.setItem('checkout_payload', JSON.stringify(payload));
      }
    } catch (e) {
      // ignore
    }

    router.push('/payment');
  }

  return (
    <div>
      <Header />
      <main className="container py-5">
        <div className="row g-4">
          <div className="col-lg-7">
            <div className="card p-3 mb-3">
              <h5 className="mb-3">Shipping details</h5>
              <div className="mb-2">
                <label className="form-label small">Full name</label>
                <input className="form-control" value={shipping.name} onChange={(e)=>setShipping({...shipping,name:e.target.value})} />
              </div>
              <div className="mb-2">
                <label className="form-label small">Phone</label>
                <input className="form-control" value={shipping.phone} onChange={(e)=>setShipping({...shipping,phone:e.target.value})} />
              </div>
              <div className="mb-2">
                <label className="form-label small">Address</label>
                <textarea className="form-control" rows={3} value={shipping.address} onChange={(e)=>setShipping({...shipping,address:e.target.value})} />
              </div>
            </div>

            <div className="card p-3">
              <h5 className="mb-3">Payment & coupon</h5>
              <div className="d-flex gap-2 mb-3">
                <input className="form-control" placeholder="Enter coupon code" value={couponCode} onChange={(e)=>setCouponCode(e.target.value)} />
                <button className="btn btn-outline-primary" onClick={applyCoupon} disabled={applying}>Apply</button>
              </div>
              {couponResult ? (
                <div className="alert alert-success small py-2">Coupon {couponResult.coupon.code} applied — saved ₹{couponResult.discount}</div>
              ) : couponCode ? (
                <div className="small text-muted">Click Apply to validate coupon</div>
              ) : null}
            </div>

          </div>

          <div className="col-lg-5">
            <div className="card p-3">
              <h5 className="mb-3">Order summary</h5>
              <div className="mb-2 d-flex justify-content-between"><div>Subtotal</div><div>₹{subtotal.toFixed(2)}</div></div>
              <div className="mb-2 d-flex justify-content-between"><div>Discount</div><div>-₹{discount.toFixed(2)}</div></div>
              <div className="mb-2 d-flex justify-content-between"><div>Delivery</div><div className="text-success">Free</div></div>
              <hr />
              <div className="d-flex justify-content-between fw-bold mb-3"><div>Total</div><div>₹{total.toFixed(2)}</div></div>

              <div className="mb-3">
                <h6 className="small mb-2">Items</h6>
                <div style={{ maxHeight: 220, overflow: 'auto' }}>
                  {(localCart?.items || []).map(it => (
                    <div key={it.productId} className="d-flex align-items-center mb-2">
                      <img src={it.image || '/images/placeholder.png'} style={{width:64,height:64,objectFit:'cover',borderRadius:6}} alt={it.title} />
                      <div className="ms-3 flex-grow-1">
                        <div className="small fw-semibold">{it.title}</div>
                        <div className="small text-muted">Qty {it.qty} • ₹{it.price}</div>
                      </div>
                      <div>₹{(it.price * it.qty).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button className="btn btn-lg btn-primary w-100" disabled={loading} onClick={proceedToPayment}>
                {loading ? 'Processing...' : 'Proceed to payment'}
              </button>

              <div className="mt-3 text-center small text-muted">
                By placing the order you agree to our <Link href="#" legacyBehavior><a>Terms</a></Link>.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
      
