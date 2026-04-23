import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Header from '../../../components/Header';
import { useAuth } from '../../../components/AuthProvider';
import { parseCookies, verifyToken } from '../../../lib/auth';
import { useToast } from '../../../components/ToastProvider';
import navHeader from '../../../data/navHeader.json'; // added

// default token; override via NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN for production
const BLOB_READ_WRITE_TOKEN = process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN;

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const matches = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[]\/+^])/g, '\\$1') + '=([^;]*)'));
  return matches ? decodeURIComponent(matches[1]) : null;
}

export default function ProductForm({ serverUser, product }) {
  const router = useRouter();
  const { id } = router.query;
  const isEditMode = !!id && !!product;

  // initialize category/subCategory from navHeader if available
  const defaultCategory = (navHeader && navHeader.length) ? navHeader[0].subTitle : '';
  const defaultSubCategory = (navHeader && navHeader[0] && navHeader[0].items && navHeader[0].items[0])
    ? (navHeader[0].items[0].subTitle || navHeader[0].items[0].label)
    : '';

  // Initialize form with product data if editing, otherwise use defaults
  const getInitialImages = () => {
    if (!product) return ['', '', '', ''];
    // Check for images array first, then additionalImages, then fallback to mainImage
    if (product.images && Array.isArray(product.images) && product.images.length) {
      const imgs = [...product.images];
      while (imgs.length < 4) imgs.push('');
      return imgs.slice(0, 4);
    }
    if (product.additionalImages && Array.isArray(product.additionalImages) && product.additionalImages.length) {
      const imgs = [...product.additionalImages];
      while (imgs.length < 4) imgs.push('');
      return imgs.slice(0, 4);
    }
    if (product.mainImage) {
      return [product.mainImage, '', '', ''];
    }
    return ['', '', '', ''];
  };

  const [form, setForm] = useState({
    title: product?.title || '',
    price: product?.price || '',
    discountPrice: product?.discountPrice || '',
    description: product?.description || '',
    sku: product?.sku || '',
    images: getInitialImages(),
    sizes: product?.sizes || [],
    category: product?.category || defaultCategory,
    subCategory: product?.subCategory || defaultSubCategory,
    ageGroup: product?.ageGroup || 'Newborn'
  });

  const [preview, setPreview] = useState(product?.mainImage || product?.image || '');
  const { user: clientUser } = useAuth();
  const user = clientUser || serverUser;
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (!user) {
    return (
      <div>
        <Header />
        <main className="container py-5">
          <h1>{isEditMode ? 'Edit Product' : 'Add Product'}</h1>
          <div className="alert alert-warning">Please login to access admin pages. <a href="/auth/login">Login</a></div>
        </main>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div>
        <Header />
        <main className="container py-5">
          <h1>{isEditMode ? 'Edit Product' : 'Add Product'}</h1>
          <div className="alert alert-danger">User is not authorized to view this page.</div>
        </main>
      </div>
    );
  }

  if (isEditMode && !product) {
    return (
      <div>
        <Header />
        <main className="container py-5">
          <h1>Edit Product</h1>
          <div className="alert alert-danger">Product not found.</div>
        </main>
      </div>
    );
  }

  function handleImageChange(e) {
    // legacy single-arg handler fallback — not used after updates
    const url = e.target.value;
    const imgs = Array.isArray(form.images) ? [...form.images] : ['', '', '', ''];
    imgs[0] = url;
    setForm({ ...form, images: imgs });
    const first = imgs.find((x) => x && x.trim());
    setPreview(first || '');
  }

  async function uploadImageFile(index, file) {
    if (!file || index < 0 || index > 3) return;

    setUploading(true);
    try {
      const { put } = await import('@vercel/blob');
      const ext = file.name.split('.').pop() || 'jpg';
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { url } = await put(`products/${safeName}`, file, {
        access: 'public',
        token: BLOB_READ_WRITE_TOKEN,
      });

      if (!url) throw new Error('Blob upload returned no URL');

      const nextImages = Array.isArray(form.images) ? [...form.images] : ['', '', '', ''];
      nextImages[index] = url;
      setForm({ ...form, images: nextImages });
      setPreview(nextImages.find((x) => x && x.trim()) || '');
      toast?.show({ type: 'success', message: `Image ${index + 1} uploaded` });
    } catch (err) {
      toast?.show({ type: 'error', message: `Upload failed: ${err?.message || err}` });
    } finally {
      setUploading(false);
    }
  }

  // helper to get current category object
  const currentCatObj = navHeader.find((c) => c.subTitle === form.category) || null;

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const csrf = getCookie('csrf') || '';
      // build product object; include category/subCategory matching new schema
      const imgs = Array.isArray(form.images) ? form.images.filter(Boolean) : [];
      const main = imgs.length ? imgs[0] : '/images/placeholder.png';
      const productPayload = {
        title: form.title,
        price: Number(form.price) || 0,
        discountPrice: form.discountPrice ? Number(form.discountPrice) : undefined,
        description: form.description,
        mainImage: main,
        additionalImages: imgs,
        sku: form.sku || null,
        sizes: Array.isArray(form.sizes) ? form.sizes : [],
        category: form.category || '',
        subCategory: form.subCategory || '',
        ageGroup: form.ageGroup || 'Uncategorized',
        // keep older field too for backward compatibility
        image: main
      };

      const url = isEditMode ? `/api/products/${product.id}` : '/api/products';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
        credentials: 'same-origin',
        body: JSON.stringify(isEditMode ? { ...productPayload, id: product.id } : productPayload),
      });

      if (!res.ok) {
        const data = await res.json().catch(()=>({}));
        throw new Error(data.error || `${isEditMode ? 'Update' : 'Create'} failed`);
      }

      await res.json();
      toast?.show({ type: 'success', message: `Product ${isEditMode ? 'updated' : 'created'}` });
      router.push('/admin/products');
    } catch (err) {
      toast?.show({ type: 'error', message: err.message || `${isEditMode ? 'Update' : 'Create'} failed` });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Header />
      <main className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="h4 mb-0">{isEditMode ? 'Edit Product' : 'Add new product'}</h1>
          <button className="btn btn-outline-secondary" onClick={() => router.push('/admin/products')}>
            Back to Products
          </button>
        </div>
        <div className="row">
          <div className="col-lg-8">
            <div className="card p-3 mb-4">
              <form onSubmit={submit}>
                <div className="mb-3">
                  <label className="form-label">Title</label>
                  <input className="form-control" value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} required />
                </div>

                <div className="mb-3 row">
                  <div className="col">
                    <label className="form-label">Price</label>
                    <input className="form-control" value={form.price} onChange={(e)=>setForm({...form,price:e.target.value})} required />
                  </div>
                  <div className="col">
                    <label className="form-label">Discount Price (optional)</label>
                    <input className="form-control" value={form.discountPrice} onChange={(e)=>setForm({...form,discountPrice:e.target.value})} />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Upload image files (4 slots)</label>
                  <div className="d-flex gap-2 flex-wrap">
                    {Array.from({ length: 4 }).map((_, i) => {
                      const src = (form.images && form.images[i]) || '';
                      return (
                        <div key={i} className="border rounded p-2" style={{ minWidth: 220, flex: '1 1 220px' }}>
                          <div className="mb-2" style={{ height: 100, backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {src ? (
                              <img src={src} alt={`img-${i}`} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                            ) : (
                              <span className="text-muted">Slot {i + 1} empty</span>
                            )}
                          </div>
                          <input
                            type="text"
                            className="form-control form-control-sm mb-2"
                            placeholder="Image URL"
                            value={src}
                            onChange={(e) => {
                              const next = Array.isArray(form.images) ? [...form.images] : ['', '', '', ''];
                              next[i] = e.target.value;
                              setForm({ ...form, images: next });
                              setPreview(next.find((x) => x && x.trim()) || '');
                            }}
                          />
                          <input
                            type="file"
                            accept="image/*"
                            className="form-control form-control-sm mb-2"
                            onChange={(e) => {
                              const file = e.target.files && e.target.files[0];
                              if (file) {
                                uploadImageFile(i, file);
                              }
                            }}
                            disabled={uploading}
                          />
                          <div className="d-flex justify-content-between">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => {
                                const next = Array.isArray(form.images) ? [...form.images] : ['', '', '', ''];
                                next[i] = '';
                                setForm({ ...form, images: next });
                                setPreview(next.find((x) => x && x.trim()) || '');
                              }}
                            >
                              Remove
                            </button>
                            <span className="text-muted small">{i === 0 ? 'Main' : `Image ${i + 1}`}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="form-text">Use 1-4 images. Enter image URLs or upload files. Uploaded files are stored in blob storage.</div>
                  {uploading && <div className="form-text text-primary">Uploading... please wait.</div>}
                </div>

                <div className="mb-3">
                  <label className="form-label">SKU Code</label>
                  <input
                    className="form-control"
                    placeholder="e.g. SKU-12345 (unique)"
                    value={form.sku || ''}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  />
                  <div className="form-text">Optional: enter a SKU to help find products in admin and orders.</div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Sizes</label>
                  <div className="d-flex gap-2 mb-2">
                    <input id="size-input" className="form-control" placeholder="Enter size (e.g. S, M, 6, 12-18 months)" style={{flex: '1 1 auto'}} />
                    <button type="button" className="btn btn-outline-primary" onClick={() => {
                      const el = document.getElementById('size-input');
                      if (!el) return;
                      const val = el.value && String(el.value).trim();
                      if (!val) return;
                      const next = Array.isArray(form.sizes) ? [...form.sizes] : [];
                      if (!next.includes(val)) next.push(val);
                      setForm({ ...form, sizes: next });
                      el.value = '';
                    }}>Add</button>
                  </div>
                  <div>
                    {(form.sizes || []).map((s, idx) => (
                      <span key={idx} className="badge bg-secondary me-2" style={{padding: '0.5rem 0.6rem'}}>
                        {s}
                        <button type="button" aria-label="remove" title="Remove" onClick={() => {
                          const next = (form.sizes || []).filter(x => x !== s);
                          setForm({ ...form, sizes: next });
                        }} className="btn btn-sm btn-link text-white ms-2 p-0" style={{textDecoration: 'none'}}>×</button>
                      </span>
                    ))}
                  </div>
                  <div className="form-text">Optional sizes list — will be stored as an array on the product.</div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows={4} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} />
                </div>

                {/* new: category / subCategory selects driven by navHeader */}
                <div className="mb-3 row">
                  <div className="col-md-4">
                    <label className="form-label">Category</label>
                    <select className="form-select" value={form.category} onChange={(e) => {
                      const selectedTitle = e.target.value;
                      const cat = navHeader.find(c => c.subTitle === selectedTitle);
                      setForm({
                        ...form,
                        category: selectedTitle,
                        subCategory: (cat && cat.items && cat.items[0] && cat.items[0].label) ? cat.items[0].label : ''
                      });
                    }}>
                      {navHeader.map((c) => (
                        <option key={c.id} value={c.subTitle}>{c.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Sub Category</label>
                    <select className="form-select" value={form.subCategory} onChange={(e)=>setForm({...form,subCategory:e.target.value})}>
                      {(currentCatObj && Array.isArray(currentCatObj.items) ? currentCatObj.items : []).map((it, idx) => {
                        const title = it.subTitle || it.label;
                        return <option key={idx} value={title}>{title}</option>;
                      })}
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Shop by Age</label>
                    <select className="form-select" value={form.ageGroup} onChange={(e)=>setForm({...form,ageGroup:e.target.value})}>
                      <option value="Newborn">Newborn</option>
                      <option value="Infants">Infants</option>
                      <option value="Toddlers">Toddlers</option>
                      <option value="Juniors">Juniors</option>
                    </select>
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button className="btn btn-primary" type="submit" disabled={loading}>
                    {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update product' : 'Create product')}
                  </button>
                  <button type="button" className="btn btn-outline-secondary" onClick={() => router.push('/admin/products')}>Cancel</button>
                </div>
              </form>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card p-3">
              <h6 className="mb-2">Preview</h6>
              <img src={preview || (form.images && form.images[0]) || '/images/placeholder.png'} alt="preview" style={{width:'100%', height:240, objectFit:'cover', borderRadius:6}} />
              <div className="mt-2 d-flex gap-2">
                {(form.images || []).map((src, idx) => src ? (
                  <img key={idx} src={src} alt={`thumb-${idx}`} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                ) : null)}
              </div>
              <div className="mt-3">
                {Array.isArray(form.sizes) && form.sizes.length > 0 && (
                  <div className="mb-2"><strong>Sizes:</strong> {form.sizes.join(', ')}</div>
                )}
                <div className="fw-semibold">{form.title || 'Product title'}</div>
                <div className="text-muted">₹{form.price || '0'}</div>
                <div className="small mt-2 text-muted">{(form.description || 'Short description').slice(0,120)}</div>
                <div className="small mt-2 text-muted">Category: {form.category || '—'}</div>
                <div className="small mt-2 text-muted">Subcategory: {form.subCategory || '—'}</div>
                <div className="small mt-2 text-muted">Age Group: {form.ageGroup || '—'}</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/** Base URL for server-side fetch to this app (avoids hardcoded localhost in production; local still uses request Host). */
function getServerSideOrigin(req) {
  const host = req?.headers?.host;
  if (host) {
    const xfp = req.headers['x-forwarded-proto'];
    const proto =
      (xfp && String(xfp).split(',')[0].trim()) ||
      (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https');
    return `${proto}://${host}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NEXTAUTH_URL) return String(process.env.NEXTAUTH_URL).replace(/\/$/, '');
  return 'http://localhost:3000';
}

export async function getServerSideProps({ req, query }) {
  const cookies = parseCookies(req);
  const token = cookies['token'];
  const payload = token ? verifyToken(token) : null;
  const serverUser = payload ? { id: payload.sub, role: payload.role, name: payload.name || null } : null;

  let product = null;
  if (query.id) {
    try {
      const origin = getServerSideOrigin(req);
      const res = await fetch(`${origin}/api/products/${encodeURIComponent(String(query.id))}`);
      if (res.ok) {
        product = await res.json();
      }
    } catch (err) {
      console.error('Failed to fetch product:', err);
    }
  }

  return { props: { serverUser, product } };
}
