import { useRouter } from 'next/router';
import useSWR from 'swr';
import Header from '../../components/Header';
import { useAuth } from '../../components/AuthProvider';
import { useToast } from '../../components/ToastProvider';
import { useState, useMemo } from 'react';

const fetcher = (url) => fetch(url).then((r) => r.json());

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;
  const { data: product } = useSWR(() => (id ? `/api/products/${id}` : null), fetcher);
  const { user, addToCart } = useAuth() || {};
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);

  // derived values with fallbacks for demo data
  const gallery = useMemo(() => {
    if (!product) return [];
    const imgs = [];
    if (product.image) imgs.push(product.image);
    if (product.images && Array.isArray(product.images)) imgs.push(...product.images);
    // ensure unique and at least one placeholder
    return imgs.length ? Array.from(new Set(imgs)) : ['/images/placeholder.png'];
  }, [product]);

  const mrp = product ? (product.mrp || Math.round((product.price || 0) * 1.6)) : 0;
  const price = product ? (product.price || 0) : 0;
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const rating = product?.rating ?? 4.5;
  const ratingCount = product?.ratingCount ?? 1300;
  const sizes = product?.sizes && product.sizes.length ? product.sizes : ['Onesize'];

  // ensure selected image/size initial values
  if (!selectedImage && gallery.length) setSelectedImage(gallery[0]);
  if (!selectedSize && sizes.length) setSelectedSize(sizes[0]);

  async function handleAdd() {
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
    } catch (e) {
      toast?.show({ type: 'error', message: e?.message || 'Add to cart failed' });
    } finally {
      setLoading(false);
    }
  }

  if (!product) {
    return (
      <div>
        <Header />
        <main className="container py-5">Loading...</main>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <main className="container py-4">
        <div className="row g-4">
          {/* Gallery */}
          <div className="col-lg-6">
            <div className="product-gallery card p-3">
              <div className="d-flex">
                <div className="thumb-list me-3 d-none d-md-flex flex-column">
                  {gallery.map((src) => (
                    <button key={src} className={`thumb btn p-0 mb-2 ${selectedImage === src ? 'active' : ''}`} onClick={() => setSelectedImage(src)} aria-label="thumbnail">
                      <img src={src} alt={product.title} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }} />
                    </button>
                  ))}
                </div>

                <div className="flex-grow-1 d-flex justify-content-center align-items-center">
                  <img src={selectedImage || gallery[0]} alt={product.title} className="img-fluid main-photo" />
                </div>
              </div>

              {/* small mobile thumbnails */}
              <div className="d-flex d-md-none mt-3 gap-2 overflow-auto">
                {gallery.map((src) => (
                  <button key={src} className={`thumb btn p-0 ${selectedImage === src ? 'active' : ''}`} onClick={() => setSelectedImage(src)}>
                    <img src={src} alt={product.title} style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 6 }} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Product info */}
          <div className="col-lg-6">
            <div className="product-info">
              <h2 className="product-brand mb-1">{product.brand || 'Brand'}</h2>
              <h1 className="product-title h4">{product.title}</h1>

              <div className="d-flex align-items-center gap-3 my-3">
                <div className="rating-box d-flex align-items-center">
                  <span className="fw-bold">{rating.toFixed(1)}</span>
                  <small className="text-muted ms-2">| {ratingCount.toLocaleString()} Ratings</small>
                </div>
              </div>

              <hr />

              <div className="mb-3">
                <div className="d-flex align-items-baseline gap-3">
                  <div className="display-price fw-bold">₹{price}</div>
                  <div className="text-muted text-decoration-line-through">MRP ₹{mrp}</div>
                  {discount > 0 && <div className="text-danger fw-semibold">({discount}% OFF)</div>}
                </div>
                <div className="text-success small mt-1">inclusive of all taxes</div>
              </div>

              <div className="mb-4">
                <div className="small fw-semibold mb-2">SELECT SIZE</div>
                <div className="d-flex flex-wrap gap-2">
                  {sizes.map((s) => (
                    <button key={s} className={`btn btn-outline-secondary size-pill ${selectedSize === s ? 'active' : ''}`} onClick={() => setSelectedSize(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="d-flex gap-3 mb-4">
                <button className="btn btn-lg btn-add w-100 d-flex align-items-center justify-content-center" onClick={handleAdd} disabled={loading}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="me-2 bi bi-bag" viewBox="0 0 16 16">
                    <path d="M8 1a2 2 0 0 0-2 2v1H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2V3a2 2 0 0 0-2-2z"/>
                  </svg>
                  {loading ? 'Adding...' : 'ADD TO BAG'}
                </button>

                <button className="btn btn-outline-secondary btn-lg d-flex align-items-center gap-2" onClick={() => toast?.show({ type: 'info', message: 'Wishlist not implemented' })}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M20.8 4.6a4.5 4.5 0 0 0-6.36 0L12 6.8l-2.44-2.2a4.5 4.5 0 1 0-6.36 6.36L12 21.2l8.8-10.24a4.5 4.5 0 0 0 0-6.36z"/>
                  </svg>
                  WISHLIST
                </button>
              </div>

              <div className="product-meta small text-muted">
                <div><strong>Delivery:</strong> Free delivery available</div>
                <div className="mt-1"><strong>Seller:</strong> {product.seller || 'Demo Seller'}</div>
                <div className="mt-1"><strong>Highlights:</strong> {product.description?.slice(0, 120) || 'Quality product'}</div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
