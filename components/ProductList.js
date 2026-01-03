import React from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from './AuthProvider';
import { useToast } from './ToastProvider';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function ProductList({ category, products: initialProducts }) {
  const router = useRouter();
  const { user, addToCart } = useAuth() || {};
  const toast = useToast();
  const [selectedSizes, setSelectedSizes] = React.useState({});

  const { data: products } = useSWR(
    category ? `/api/products?category=${category}` : null,
    fetcher,
    { fallbackData: initialProducts }
  );

  async function handleAddToCart(product) {
    if (!user) {
      toast?.show?.({ type: 'info', message: 'Please login to add items to cart' });
      router.push('/auth/login');
      return;
    }
    if (!addToCart) {
      toast?.show?.({ type: 'error', message: 'Add to cart not available' });
      return;
    }
    // if product has sizes, ensure user selected one
    const hasSizes = Array.isArray(product.sizes) && product.sizes.length;
    const chosenSize = selectedSizes[product.id] || (hasSizes ? null : null);
    if (hasSizes && !chosenSize) {
      toast?.show?.({ type: 'info', message: 'Please select a size before adding to cart' });
      return;
    }

    try {
      await addToCart({
        productId: product.id || product._id || '',
        qty: 1,
        title: product.title,
        price: product.discountPrice ?? product.price ?? 0,
        currency: product.currency || 'INR',
        image: product.mainImage || product.image || (product.images && product.images[0]) || '/images/placeholder.png',
        sku: product.sku || product.skuCode || product.sku_code || null,
        size: chosenSize || (product.sizes && product.sizes[0]) || null,
        product
      });
      toast?.show?.({ type: 'success', message: 'Added to cart' });
    } catch (err) {
      toast?.show?.({ type: 'error', message: err?.message || 'Add to cart failed' });
    }
  }

  return (
    <div className="row g-3">
      {(!products || products.length === 0) ? (
        <div className="col-12">
          <div className="alert alert-info">No products found.</div>
        </div>
      ) : products.map((product) => (
        <div key={product.id} className="col-6 col-md-4 col-lg-3">
            <div className="card h-100 shadow-sm">
            <Link href={`/product/${product.id}`} legacyBehavior>
              <a>
                <img
                  src={product.mainImage || product.image || '/images/placeholder.png'}
                  className="card-img-top"
                  style={{ height: 220, objectFit: 'cover' }}
                  alt={product.title}
                />
              </a>
            </Link>
            <div className="card-body d-flex flex-column">
              <h6 className="mb-1" style={{ minHeight: '2.2rem' }}>{product.title}</h6>
              {Array.isArray(product.sizes) && product.sizes.length > 0 && (
                <div className="mb-2">
                  <select className="form-select form-select-sm mb-2" value={selectedSizes[product.id] || ''} onChange={(e) => setSelectedSizes({...selectedSizes, [product.id]: e.target.value})}>
                    <option value="">Select size</option>
                    {product.sizes.map((s) => <option key={s} value={s}>{typeof s === 'string' ? s : (s.label || s.value || s)}</option>)}
                  </select>
                </div>
              )}
              <div className="mb-2 text-muted">
                <div>{(product.discountPrice ?? product.price) ? `₹${product.discountPrice ?? product.price}` : '₹0'}</div>
                <div className="small text-muted">
                  {product.category || ''} / {product.subCategory || ''}
                  {product.ageGroup ? ` • Age: ${product.ageGroup}` : ''}
                </div>
                <div className="small text-muted">
                  Seller: {product.seller?.sellerName || (typeof product.seller === 'string' ? product.seller : '—')}
                </div>
              </div>
              <div className="mt-auto d-flex gap-2">
                {/* image click already navigates below; provide Add to cart button here */}
                <button className="btn btn-sm btn-primary flex-grow-1" onClick={() => handleAddToCart(product)}>
                  Add to cart
                </button>
                <Link href={`/product/${product.id}`} legacyBehavior>
                  <a className="btn btn-sm btn-outline-secondary">Details</a>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )) || (
        <div className="col-12">
          <div className="text-muted">Loading products...</div>
        </div>
      )}
    </div>
  );
}
