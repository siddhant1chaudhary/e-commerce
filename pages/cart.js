import { useEffect, useState } from 'react';
import Header from '../components/Header';
import { useAuth } from '../components/AuthProvider';
import Link from 'next/link';
import { useToast } from '../components/ToastProvider';
import { useRouter } from 'next/router';

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const matches = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[]\/+^])/g, '\\$1') + '=([^;]*)'));
  return matches ? decodeURIComponent(matches[1]) : null;
}

export default function CartPage() {
  const { cart: ctxCart, refreshCart } = useAuth() || {};
  const toast = useToast();
  const router = useRouter();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // initialize with context cart and refresh from server
    if (!cart) {
      setCart(ctxCart || null);
      refreshCart?.();
    }
    // No dependencies to ensure this runs only once
  }, []); // Remove ctxCart from dependencies to avoid unnecessary calls

  useEffect(() => {
    // fetch latest cart on mount to ensure freshness
    let mounted = true;
    if (!ctxCart) { // Fetch only if context cart is not already available
      setLoading(true);
      fetch('/api/cart', { credentials: 'same-origin' })
        .then((r) => r.json())
        .then((c) => { if (mounted) setCart(c); })
        .catch(() => {})
        .finally(() => { if (mounted) setLoading(false); });
    }
    return () => { mounted = false; };
  }, []); // Empty dependency array ensures this runs only once on mount

  function computeSubtotal(items = []) {
    return items.reduce((sum, it) => sum + ((Number(it.price) || 0) * (Number(it.qty) || 0)), 0);
  }

  async function saveCartItems(items) {
    setSaving(true);
    try {
      const csrf = getCookie('csrf') || '';
      const res = await fetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
        credentials: 'same-origin',
        body: JSON.stringify({ items })
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        throw new Error(err.error || 'Save failed');
      }
      const updated = await res.json();
      setCart(updated);
      // try to update context via refresh if available
      refreshCart?.();
      toast?.show({ type: 'success', message: 'Cart updated' });
    } catch (e) {
      toast?.show({ type: 'error', message: e.message || 'Could not update cart' });
    } finally {
      setSaving(false);
    }
  }

  function changeQty(productId, delta) {
    if (!cart) return;
    const items = cart.items.map(i => i.productId === productId ? { ...i, qty: Math.max(0, (Number(i.qty)||0) + delta) } : i)
      .filter(i => i.qty > 0);
    setCart({ ...cart, items });
    saveCartItems(items);
  }

  function setQty(productId, qty) {
    if (!cart) return;
    const items = cart.items.map(i => i.productId === productId ? { ...i, qty: Math.max(0, Number(qty) || 0) } : i)
      .filter(i => i.qty > 0);
    setCart({ ...cart, items });
    saveCartItems(items);
  }

  function removeItem(productId) {
    if (!cart) return;
    const items = cart.items.filter(i => i.productId !== productId);
    setCart({ ...cart, items });
    saveCartItems(items);
  }

  if (loading) {
    return (
      <div>
        <Header />
        <main className="container py-5"><div>Loading cart...</div></main>
      </div>
    );
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div>
        <Header />
        <main className="container py-5">
          <h1 className="mb-4">Your Cart</h1>
          <div className="card p-4 text-center">
            <p className="mb-3">Your cart is empty.</p>
            <Link href="/" legacyBehavior><a className="btn btn-primary">Continue shopping</a></Link>
          </div>
        </main>
      </div>
    );
  }

  const subtotal = computeSubtotal(cart.items);

  return (
    <div>
      <Header />
      <main className="container py-5">
        <h1 className="mb-4">Your Cart ({cart.items.length})</h1>

        <div className="row">
          <div className="col-lg-8">
            <div className="list-group">
              {cart.items.map(item => (
                <div key={item.productId} className="list-group-item mb-3 p-3 bg-white border rounded d-flex align-items-start">
                  <img src={item.image || '/images/placeholder.png'} alt={item.title} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 6 }} />
                  <div className="ms-3 flex-grow-1">
                    <div className="d-flex justify-content-between">
                      <div>
                        <div className="fw-semibold">{item.title}</div>
                        <div className="text-muted small">₹{item.price}</div>
                      </div>
                      <div className="text-end">
                        <div className="mb-2">₹{(item.price * item.qty).toFixed(2)}</div>
                        <button className="btn btn-sm btn-link text-danger" onClick={() => removeItem(item.productId)}>Remove</button>
                      </div>
                    </div>

                    <div className="mt-3 d-flex align-items-center gap-2">
                      <div className="input-group input-group-sm" style={{ width: 130 }}>
                        <button className="btn btn-outline-secondary" type="button" onClick={() => changeQty(item.productId, -1)} disabled={saving || item.qty <= 1}>−</button>
                        <input className="form-control text-center" value={item.qty} onChange={(e) => setQty(item.productId, e.target.value)} />
                        <button className="btn btn-outline-secondary" type="button" onClick={() => changeQty(item.productId, 1)} disabled={saving}>+</button>
                      </div>
                      <div className="text-muted small">Qty</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card p-3">
              <h5 className="mb-3">Price Details</h5>
              <div className="d-flex justify-content-between">
                <div className="text-muted">Subtotal</div>
                <div>₹{subtotal.toFixed(2)}</div>
              </div>
              <div className="d-flex justify-content-between mt-2">
                <div className="text-muted">Delivery</div>
                <div className="text-success">Free</div>
              </div>
              <hr />
              <div className="d-flex justify-content-between fw-bold">
                <div>Total</div>
                <div>₹{subtotal.toFixed(2)}</div>
              </div>

              <button
                className="btn btn-danger w-100 mt-3"
                disabled={saving}
                onClick={() => router.push('/checkout')}
              >
                {saving ? 'Processing...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
