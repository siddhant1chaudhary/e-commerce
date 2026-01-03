import { useState } from 'react';
import { useRouter } from 'next/router';
import Header from '../../../components/Header';
import { useAuth } from '../../../components/AuthProvider';
import { parseCookies, verifyToken } from '../../../lib/auth';
import { useToast } from '../../../components/ToastProvider';
import navHeader from '../../../data/navHeader.json'; // added

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const matches = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[]\/+^])/g, '\\$1') + '=([^;]*)'));
  return matches ? decodeURIComponent(matches[1]) : null;
}

export default function NewProduct({ serverUser }) {
  // initialize category/subCategory from navHeader if available
  const defaultCategory = (navHeader && navHeader.length) ? navHeader[0].subTitle : '';
  const defaultSubCategory = (navHeader && navHeader[0] && navHeader[0].items && navHeader[0].items[0])
    ? (navHeader[0].items[0].subTitle || navHeader[0].items[0].label)
    : '';

  // added ageGroup to form state; support up to 4 image URLs
  const [form, setForm] = useState({
    title: '',
    price: '',
    description: '',
    images: ['', '', '', ''],
    sizes: [],
    category: defaultCategory,
    subCategory: defaultSubCategory,
    ageGroup: 'Newborn' // default Shop by Age
  });
  const [preview, setPreview] = useState('');
  const router = useRouter();
  const { user: clientUser } = useAuth();
  const user = clientUser || serverUser;
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <div>
        <Header />
        <main className="container py-5">
          <h1>Add Product</h1>
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
          <h1>Add Product</h1>
          <div className="alert alert-danger">User is not authorized to view this page.</div>
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
        description: form.description,
        mainImage: main,
        additionalImages: imgs,
        sku: form.sku || null,
        sizes: Array.isArray(form.sizes) ? form.sizes : [],
        category: form.category || '',
        subCategory: form.subCategory || '',
        ageGroup: form.ageGroup || 'Uncategorized', // new field
        // keep older field too for backward compatibility
        image: main
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
        credentials: 'same-origin',
        body: JSON.stringify(productPayload),
      });
      if (!res.ok) {
        const data = await res.json().catch(()=>({}));
        throw new Error(data.error || 'Create failed');
      }
      await res.json();
      toast?.show({ type: 'success', message: 'Product created' });
      router.push('/admin/products');
    } catch (err) {
      toast?.show({ type: 'error', message: err.message || 'Create failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Header />
      <main className="container py-4">
        <div className="row">
          <div className="col-lg-8">
            <h1 className="h4 mb-3">Add new product</h1>
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
                </div>

                <div className="mb-3">
                  <label className="form-label">Image URLs (maximum 4)</label>
                  <div className="d-flex gap-2 flex-wrap">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <input
                        key={i}
                        className="form-control"
                        placeholder={i === 0 ? 'Main image URL (recommended)' : `Image ${i + 1} URL`}
                        value={(form.images && form.images[i]) || ''}
                        onChange={(e) => {
                          const imgs = Array.isArray(form.images) ? [...form.images] : ['', '', '', ''];
                          imgs[i] = e.target.value;
                          setForm({ ...form, images: imgs });
                          const first = imgs.find((x) => x && x.trim());
                          setPreview(first || '');
                        }}
                        style={{ minWidth: 0, flex: '1 1 200px' }}
                      />
                    ))}
                  </div>
                  <div className="form-text">Provide up to 4 image URLs. First non-empty URL will be used as main image.</div>
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
                  <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create product'}</button>
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

export async function getServerSideProps({ req }) {
  const cookies = parseCookies(req);
  const token = cookies['token'];
  const payload = token ? verifyToken(token) : null;
  const serverUser = payload ? { id: payload.sub, role: payload.role, name: payload.name || null } : null;
  return { props: { serverUser } };
}
