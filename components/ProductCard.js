import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { useToast } from './ToastProvider';
import { useRouter } from 'next/router';

export default function ProductCard({ product }) {
  const { user, addToCart } = useAuth() || {};
  const toast = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);

  async function handleAdd(e) {
    e.preventDefault();

    // require login
    if (!user) {
      toast?.show({ type: 'info', message: 'Please login or sign up to add items to your cart' });
      router.push('/auth/login');
      return;
    }

    if (!addToCart) {
      toast?.show({ type: 'error', message: 'Unable to add to cart' });
      return;
    }
    setLoading(true);
    try {
      // if product defines sizes, require selection
      if (Array.isArray(product.sizes) && product.sizes.length && !selectedSize) {
        toast?.show({ type: 'info', message: 'Please select a size before adding to cart' });
        setLoading(false);
        return;
      }

      await addToCart({ productId: product.id, qty: 1, title: product.title, price: product.price, image: product.image, sku: product.sku || product.skuCode || product.sku_code || null, size: selectedSize || (product.sizes && product.sizes[0]) || null });
      toast?.show({ type: 'success', message: 'Added to cart' });
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
        {Array.isArray(product.sizes) && product.sizes.length > 0 && (
          <div className="mb-2 mt-2">
            <select className="form-select form-select-sm" value={selectedSize || ''} onChange={(e) => setSelectedSize(e.target.value)}>
              <option value="">Select size</option>
              {product.sizes.map((s) => <option key={s} value={typeof s === 'string' ? s : (s.label || s.value || s)}>{typeof s === 'string' ? s : (s.label || s.value || s)}</option>)}
            </select>
          </div>
        )}
        <div className="d-flex justify-content-between align-items-center mt-2">
          <div className="product-price">₹{product.price}</div>
          <div className="price-muted">Free delivery</div>
        </div>
        <div className="mt-3">
          <button className="btn btn-sm btn-outline-primary w-100" onClick={handleAdd} disabled={loading}>
            {loading ? 'Adding...' : 'Add to cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
