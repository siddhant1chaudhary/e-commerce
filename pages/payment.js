import { useEffect, useState } from 'react';
import Header from '../components/Header';
import { useAuth } from '../components/AuthProvider';
import { useToast } from '../components/ToastProvider';
import { useRouter } from 'next/router';
import Link from 'next/link';

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[]\/+^])/g,'\\$1') + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

export default function PaymentPage() {
  const { refreshCart } = useAuth() || {};
  const toast = useToast();
  const router = useRouter();

  const [payload, setPayload] = useState(null);
  const [methodType, setMethodType] = useState('COD'); // 'COD' or 'ONLINE'
  const [onlineMethod, setOnlineMethod] = useState('CARD'); // CARD, UPI, NETBANKING, WALLET
  const [processing, setProcessing] = useState(false);
  const [card, setCard] = useState({ number:'', name:'', exp:'', cvv:'' });
  const [upi, setUpi] = useState({ id: '' });

  useEffect(() => {
    // run once on mount
    if (typeof window === 'undefined') return;

    try {
      const raw = sessionStorage.getItem('checkout_payload');
      if (!raw) {
        // avoid infinite redirect/toast loops:
        // if not already redirected, mark and replace to /checkout once.
        if (!sessionStorage.getItem('redirected_to_checkout')) {
          sessionStorage.setItem('redirected_to_checkout', '1');
          // use replace so back button doesn't loop
          router.replace('/checkout');
        } else {
          // already redirected once — clear flag and stay (avoid repeated toast)
          sessionStorage.removeItem('redirected_to_checkout');
        }
        return;
      }

      // valid payload found — clear any redirect flag and set payload
      sessionStorage.removeItem('redirected_to_checkout');
      setPayload(JSON.parse(raw));
    } catch (e) {
      // parsing failed — ensure we don't loop, replace to checkout once
      if (!sessionStorage.getItem('redirected_to_checkout')) {
        sessionStorage.setItem('redirected_to_checkout', '1');
        router.replace('/checkout');
      } else {
        sessionStorage.removeItem('redirected_to_checkout');
      }
    }
    // run only once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!payload) {
    return (<div><Header /><main className="container py-5"><div>Loading...</div></main></div>);
  }

  async function submitOrder() {
    if (!payload) return;
    setProcessing(true);
    try {
      // If ONLINE selected, do a simple validation/mock payment
      if (methodType === 'ONLINE') {
        if (onlineMethod === 'CARD') {
          if (!card.number || !card.name || !card.exp || !card.cvv) {
            toast?.show({ type: 'error', message: 'Please enter card details' });
            setProcessing(false);
            return;
          }
          // mock card validation delay
          await new Promise(r => setTimeout(r, 900));
        } else if (onlineMethod === 'UPI') {
          if (!upi.id) { toast?.show({ type: 'error', message: 'Enter UPI id' }); setProcessing(false); return; }
          await new Promise(r => setTimeout(r, 700));
        } else {
          // mock other online methods
          await new Promise(r => setTimeout(r, 700));
        }
      }

      // call checkout API to create order (server reads cart by cookie)
      const csrf = getCookie('csrf') || '';
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
        credentials: 'same-origin',
        body: JSON.stringify({
          shipping: payload.shipping,
          paymentMethod: methodType === 'COD' ? 'COD' : onlineMethod,
          couponCode: payload.couponCode || null
        })
      });

      if (!res.ok) {
        const e = await res.json().catch(()=>({}));
        throw new Error(e.error || 'Order failed');
      }

      const data = await res.json();
      toast?.show({ type: 'success', message: 'Order placed successfully' });

      // clear payload and refresh cart
      if (typeof window !== 'undefined') sessionStorage.removeItem('checkout_payload');
      await refreshCart?.();
      router.push(`/order/${data.orderId}`);
    } catch (err) {
      toast?.show({ type: 'error', message: err.message || 'Payment failed' });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div>
      <Header />
      <main className="container py-5">
        <div className="row g-4">
          <div className="col-lg-7">
            <div className="card p-3 mb-3">
              <h5 className="mb-3">Choose payment option</h5>

              <div className="mb-3">
                <div className="form-check">
                  <input className="form-check-input" type="radio" name="methodType" id="cod" value="COD" checked={methodType === 'COD'} onChange={()=>setMethodType('COD')} />
                  <label className="form-check-label" htmlFor="cod">Cash on Delivery</label>
                </div>
                <div className="form-check mt-2">
                  <input className="form-check-input" type="radio" name="methodType" id="online" value="ONLINE" checked={methodType === 'ONLINE'} onChange={()=>setMethodType('ONLINE')} />
                  <label className="form-check-label" htmlFor="online">Pay Online</label>
                </div>
              </div>

              {methodType === 'ONLINE' && (
                <div className="card p-3 mt-3">
                  <h6 className="mb-2">Select online method</h6>
                  <div className="d-flex gap-2 flex-wrap mb-3">
                    <button className={`btn ${onlineMethod==='CARD' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={()=>setOnlineMethod('CARD')}>Card</button>
                    <button className={`btn ${onlineMethod==='UPI' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={()=>setOnlineMethod('UPI')}>UPI</button>
                    <button className={`btn ${onlineMethod==='NETBANKING' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={()=>setOnlineMethod('NETBANKING')}>Netbanking</button>
                    <button className={`btn ${onlineMethod==='WALLET' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={()=>setOnlineMethod('WALLET')}>Wallet</button>
                  </div>

                  {onlineMethod === 'CARD' && (
                    <div className="row g-2">
                      <div className="col-12">
                        <input className="form-control" placeholder="Card number" value={card.number} onChange={(e)=>setCard({...card,number:e.target.value})} />
                      </div>
                      <div className="col-6">
                        <input className="form-control" placeholder="Name on card" value={card.name} onChange={(e)=>setCard({...card,name:e.target.value})} />
                      </div>
                      <div className="col-3">
                        <input className="form-control" placeholder="MM/YY" value={card.exp} onChange={(e)=>setCard({...card,exp:e.target.value})} />
                      </div>
                      <div className="col-3">
                        <input className="form-control" placeholder="CVV" value={card.cvv} onChange={(e)=>setCard({...card,cvv:e.target.value})} />
                      </div>
                    </div>
                  )}

                  {onlineMethod === 'UPI' && (
                    <div>
                      <input className="form-control" placeholder="UPI ID (e.g. name@bank)" value={upi.id} onChange={(e)=>setUpi({ id: e.target.value })} />
                      <div className="small text-muted mt-2">You will be redirected to UPI app (mock)</div>
                    </div>
                  )}

                  {(onlineMethod === 'NETBANKING' || onlineMethod === 'WALLET') && (
                    <div className="small text-muted">You will be redirected to the selected provider (mock)</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="col-lg-5">
            <div className="card p-3">
              <h5 className="mb-3">Order summary</h5>
              <div className="mb-2 d-flex justify-content-between"><div>Subtotal</div><div>₹{(payload.subtotal||0).toFixed(2)}</div></div>
              <div className="mb-2 d-flex justify-content-between"><div>Discount</div><div>-₹{(payload.discount||0).toFixed(2)}</div></div>
              <div className="mb-2 d-flex justify-content-between"><div>Delivery</div><div className="text-success">Free</div></div>
              <hr />
              <div className="d-flex justify-content-between fw-bold mb-3"><div>Total</div><div>₹{(payload.total||0).toFixed(2)}</div></div>

              <div className="mb-3">
                <h6 className="small mb-2">Shipping</h6>
                <div>{payload.shipping?.name}</div>
                <div className="small text-muted">{payload.shipping?.phone}</div>
                <div className="small text-muted">{payload.shipping?.address}</div>
              </div>

              <button className="btn btn-lg btn-primary w-100" disabled={processing} onClick={submitOrder}>
                {processing ? 'Processing...' : (methodType === 'COD' ? 'Place Order (COD)' : `Pay & Place Order (${onlineMethod})`)}
              </button>

              <div className="mt-3 text-center small text-muted">
                <Link href="/checkout" legacyBehavior><a>Back to checkout</a></Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
