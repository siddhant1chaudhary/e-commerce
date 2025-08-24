import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { useToast } from './ToastProvider';
import { useRouter } from 'next/router';

export default function ProductCard({ product }) {
  const { user, addToCart } = useAuth() || {};
  const toast = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();

    // require login
    if (!user) {
      toast?.show({ type: 'info', message: 'Please login or sign up to add items to your bag' });
      router.push('/auth/login');
      return;
    }

    if (!addToCart) {
      toast?.show({ type: 'error', message: 'Unable to add to cart' });
      return;
    }
    setLoading(true);
    try {
      await addToCart({ productId: product.id, qty: 1, title: product.title, price: product.price, image: product.image });
      toast?.show({ type: 'success', message: 'Added to bag' });
    } catch (err) {
      toast?.show({ type: 'error', message: err?.message || 'Add to cart failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card card-demo h-100">
      <img src={product.image} className="card-img-top" alt={product.title} />
      <div className="card-body d-flex flex-column">
        <div className="product-title">{product.title}</div>
        <div className="d-flex justify-content-between align-items-center mt-2">
          <div className="product-price">₹{product.price}</div>
          <div className="price-muted">Free delivery</div>
        </div>
        <div className="mt-3">
          <button className="btn btn-sm btn-outline-primary w-100" onClick={handleAdd} disabled={loading}>
            {loading ? 'Adding...' : 'Add to bag'}
          </button>
        </div>
      </div>
    </div>
  );
}
