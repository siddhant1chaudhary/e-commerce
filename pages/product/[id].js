import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import Header from '../../components/Header';
import useSWR from 'swr';
import { useAuth } from '../../components/AuthProvider';
import { useToast } from '../../components/ToastProvider';
import { useState, useMemo, useEffect } from 'react'; // added useEffect

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

  // derived values with fallbacks (use new schema fields)
  const gallery = useMemo(() => {
    if (!product) return [];
    const imgs = [];
    if (product.mainImage) imgs.push(product.mainImage);
    if (Array.isArray(product.additionalImages) && product.additionalImages.length) imgs.push(...product.additionalImages);
    // compatibility: support legacy fields
    if (product.image) imgs.push(product.image);
    if (Array.isArray(product.images)) imgs.push(...product.images);
    return imgs.length ? Array.from(new Set(imgs)) : [];
  }, [product]);

  // prices (prefer discountPrice when present)
  const originalPrice = product ? (product.price ?? 0) : 0;
  const salePrice = product ? (product.discountPrice ?? product.price ?? 0) : 0;
  const mrp = product ? (product.mrp ?? Math.round(originalPrice * 1.6)) : 0;
  const discount = mrp > salePrice ? Math.round(((mrp - salePrice) / mrp) * 100) : 0;

  // rating: normalize shapes to numbers
  const avgRating = product
    ? Number(typeof product.rating === 'number' ? product.rating : (product.rating?.average ?? product.rating ?? 5)) || 5
    : 0;
  const ratingCount = product
    ? Number(product.rating?.count ?? product.ratingCount ?? 5) || 5
    : 0;

  // sizes: support array of objects or strings
  const sizeOptions = useMemo(() => {
    if (!product) return ['Onesize'];
    if (Array.isArray(product.sizes) && product.sizes.length) {
      return product.sizes.map(s => (typeof s === 'string' ? s : (s.label || s.value || 'Onesize')));
    }
    if (product.freeSize?.available) return ['FreeSize'];
    return ['Onesize'];
  }, [product]);

  // initialize selected image/size safely in effects
  useEffect(() => {
    if (gallery && gallery.length && !selectedImage) setSelectedImage(gallery[0]);
  }, [gallery, selectedImage]);

  useEffect(() => {
    // Do not auto-select a size; require explicit user choice for validation
  }, [sizeOptions]);
console.log('Selected Size:', selectedSize);
  async function handleAdd() {
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

    // require explicit size selection when product has multiple sizes
    const hasSizes = Array.isArray(sizeOptions) && sizeOptions.length && !(sizeOptions.length === 1 && sizeOptions[0] === 'Onesize');
    if (hasSizes && !selectedSize) {
      toast?.show({ type: 'info', message: 'Please select a size before adding to cart' });
      return;
    }

    setLoading(true);
    try {
      const payload ={
        productId: product.id || product._id || '',
        qty: 1,
        title: product.title,
        price: salePrice,
        currency: product.currency || 'INR',
        image: product.mainImage || (gallery[0] || '/images/placeholder.png'),
        size: selectedSize,
        product // include full product if cart expects product object
      }
      console.log('Add to Cart Payload:', payload); 
      await addToCart(payload);
      toast?.show({ type: 'success', message: 'Added to cart' });
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

  // helper formatters
  const fmtDate = (d) => {
    try { return new Date(d).toLocaleString(); } catch (e) { return d || ''; }
  };

  // use 'from' query (set by ProductList links) to return to the previous listing.
  const from = typeof router.query.from === 'string' && router.query.from ? router.query.from : null;

  return (
    <>
      <Head>
        <title>{/* ...existing title code ... */}</title>
      </Head>

      <Header />
      <main className="container py-4">
        <div className="mb-3">
          {from ? (
            <Link href={from} legacyBehavior>
              <a className="btn btn-sm btn-outline-secondary">&larr; Back to results</a>
            </Link>
          ) : (
            <button className="btn btn-sm btn-outline-secondary" onClick={() => router.back()}>&larr; Back</button>
          )}
        </div>
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

              {/* new: category / subcategory / age group line */}
              <div className="small text-muted mb-2">
                <span className="me-3"><strong>Category:</strong> {product.category || '—'}</span>
                <span className="me-3"><strong>Sub:</strong> {product.subCategory || '—'}</span>
                <span className="me-3"><strong>Age:</strong> {product.ageGroup || '—'}</span>
              </div>

              <div className="d-flex align-items-center gap-3 my-3">
                <div className="rating-box d-flex align-items-center">
                  <span className="fw-bold">{avgRating.toFixed(1)}</span>
                  <small className="text-muted ms-2">| {ratingCount.toLocaleString()} Ratings</small>
                </div>
              </div>

              <hr />

              <div className="mb-3">
                <div className="d-flex align-items-baseline gap-3">
                  <div className="display-price fw-bold">
                    {product.currency || 'INR'} {salePrice}
                  </div>
                  <div className="text-muted text-decoration-line-through">
                    {originalPrice > salePrice ? `${product.currency || 'INR'} ${originalPrice}` : null}
                  </div>
                  {discount > 0 && <div className="text-danger fw-semibold">({discount}% OFF)</div>}
                </div>
                <div className="text-success small mt-1">inclusive of all taxes</div>
              </div>

              <div className="mb-4">
                <div className="small fw-semibold mb-2">SELECT SIZE</div>
                <div className="d-flex flex-wrap gap-2">
                  {sizeOptions.map((s) => (
                    <button key={s} className={`btn btn-outline-secondary size-pill ${selectedSize === s ? 'active' : ''}`} onClick={() => setSelectedSize(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="d-flex gap-3 mb-4">
                <button className="btn btn-lg btn-add w-100 d-flex align-items-center justify-content-center" onClick={handleAdd} disabled={loading || (Array.isArray(sizeOptions) && sizeOptions.length && !selectedSize)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="me-2 bi bi-bag" viewBox="0 0 16 16">
                    <path d="M8 1a2 2 0 0 0-2 2v1H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2V3a2 2 0 0 0-2-2z"/>
                  </svg>
                  {loading ? 'Adding...' : 'ADD TO CART'}
                </button>

                <button className="btn btn-outline-secondary btn-lg d-flex align-items-center gap-2" onClick={() => toast?.show({ type: 'info', message: 'Wishlist not implemented' })}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.8 4.6a4.5 4.5 0 0 0-6.36 0L12 6.8l-2.44-2.2a4.5 4.5 0 1 0-6.36 6.36L12 21.2l8.8-10.24a4.5 4.5 0 0 0 0-6.36z" />
                  </svg>
                  WISHLIST
                </button>
              </div>

              <div className="product-meta small text-muted">
                <div><strong>Delivery:</strong> Free delivery available</div>

                {/* render seller object safely */}
                <div className="mt-1">
                  <strong>Seller:</strong>{' '}
                  {product.seller?.sellerName || (typeof product.seller === 'string' ? product.seller : 'Demo Seller')}
                  {product.seller?.rating ? <span className="text-muted ms-2">({Number(product.seller.rating).toFixed(1)})</span> : null}
                </div>

                {/* product type, stock, tags */}
                {/* <div className="mt-1"><strong>Type:</strong> {product.productType || '—'}</div> */}
                {/* <div className="mt-1"><strong>Stock:</strong> {typeof product.stock === 'number' ? (product.stock > 0 ? `${product.stock} available` : 'Out of stock') : '—'}</div> */}
                {Array.isArray(product.tags) && product.tags.length > 0 && (
                  <div className="mt-1">
                    <strong>Tags:</strong>{' '}
                    {product.tags.map((t) => (
                      <span key={t} className="badge bg-light text-dark me-1">{t}</span>
                    ))}
                  </div>
                )}

                <div className="mt-1"><strong>Highlights:</strong> {product.description?.slice(0, 120) || 'Quality product'}</div>

                {/* created / updated
                <div className="mt-2 text-muted small">
                  <div>Created: {fmtDate(product.createdAt)}</div>
                  <div>Updated: {fmtDate(product.updatedAt)}</div>
                </div> */}
              </div>

            </div>
          </div>
        </div>
      </main>

    </>
  );
}
