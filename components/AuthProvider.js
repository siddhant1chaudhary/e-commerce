import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('demo_user');
      if (raw) setUser(JSON.parse(raw));
    } catch (e) {
      setUser(null);
    }
    // load cart on mount (use refreshCart below)
  }, []);

  function getCookie(name) {
		if (typeof document === 'undefined') return null;
		const matches = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[]\/+^])/g, '\\$1') + '=([^;]*)'));
		return matches ? decodeURIComponent(matches[1]) : null;
	}

  // memoized refreshCart so its identity is stable across renders
  const refreshCart = useCallback(async () => {
    try {
      const res = await fetch('/api/cart', { credentials: 'same-origin' });
      if (!res.ok) return null;
      const c = await res.json();
      setCart(c);
      return c;
    } catch (e) {
      return null;
    }
  }, []);

  // memoized login to reuse refreshCart safely
  const login = useCallback(async (userObj) => {
    setUser(userObj);
    try { localStorage.setItem('demo_user', JSON.stringify(userObj)); } catch (e) {}

    // always attempt to merge guest cart (if any) into user's cart on login.
    // pass guestCartId or null — server will return existing user cart if present.
    const guestCartId = getCookie('cartId') || null;
    try {
      await fetch('/api/cart/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCookie('csrf') || '' },
        credentials: 'same-origin',
        body: JSON.stringify({ guestCartId })
      });
    } catch (e) {
      // ignore merge errors (server will still provide cart on refresh)
    }

    // refresh cart after merge/assignment
    await refreshCart();
  }, [refreshCart]);

  const logout = useCallback(() => {
    setUser(null);
    try { localStorage.removeItem('demo_user'); } catch (e) {}
    // call server logout to clear auth cookies
    try { fetch('/api/auth/logout'); } catch (e) {}
    setCart(null);
    router.push('/');
  }, [router]);

  // memoized addToCart
  const addToCart = useCallback(async ({ productId, qty = 1, title = '', price = 0, image = '' }) => {
    try {
      const csrf = getCookie('csrf') || '';
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
        credentials: 'same-origin',
        body: JSON.stringify({ productId, qty, title, price, image })
      });
      if (!res.ok) {
        const e = await res.json().catch(()=>({}));
        throw new Error(e.error || 'Add to cart failed');
      }
      const updated = await res.json();
      setCart(updated);
      return updated;
    } catch (err) {
      throw err;
    }
  }, []);

  async function clearCart() {
    try {
      await fetch('/api/cart', { method: 'PUT', headers:{'Content-Type':'application/json','x-csrf-token': getCookie('csrf') || ''}, credentials: 'same-origin', body: JSON.stringify({ items: [] }) });
      setCart({ items: [] });
    } catch (e) {}
  }

  const value = { user, login, logout, cart, addToCart, refreshCart, clearCart };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
