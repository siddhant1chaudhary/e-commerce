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

  // added ageGroup to form state
  const [form, setForm] = useState({
    title: '',
    price: '',
    description: '',
    image: '',
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
    const url = e.target.value;
    setForm({ ...form, image: url });
    setPreview(url);
  }

  // helper to get current category object
  const currentCatObj = navHeader.find((c) => c.subTitle === form.category) || null;

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const csrf = getCookie('csrf') || '';
      // build product object; include category/subCategory matching new schema
      const productPayload = {
        title: form.title,
        price: Number(form.price) || 0,
        description: form.description,
        mainImage: form.image || '/images/placeholder.png',
        category: form.category || '',
        subCategory: form.subCategory || '',
        ageGroup: form.ageGroup || 'Uncategorized', // new field
        // keep older field too for compatibility if API expects 'image'
        image: form.image || '/images/placeholder.png'
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
                  <div className="col">
                    <label className="form-label">Image URL</label>
                    <input className="form-control" value={form.image} onChange={handleImageChange} placeholder="https://..." />
                  </div>
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
              <img src={preview || form.image || '/images/placeholder.png'} alt="preview" style={{width:'100%', height:240, objectFit:'cover', borderRadius:6}} />
              <div className="mt-3">
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
