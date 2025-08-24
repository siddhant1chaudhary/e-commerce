import { useState } from 'react';
import { useRouter } from 'next/router';
import Header from '../../../components/Header';
import { useAuth } from '../../../components/AuthProvider';
import { parseCookies, verifyToken } from '../../../lib/auth';
import { useToast } from '../../../components/ToastProvider';

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const matches = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[]\/+^])/g, '\\$1') + '=([^;]*)'));
  return matches ? decodeURIComponent(matches[1]) : null;
}

export default function NewProduct({ serverUser }) {
  const [form, setForm] = useState({ title: '', price: '', description: '', image: '' });
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

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const csrf = getCookie('csrf') || '';
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
        credentials: 'same-origin',
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(()=>({}));
        throw new Error(data.error || 'Create failed');
      }
      const created = await res.json();
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
              <img src={preview || '/images/placeholder.png'} alt="preview" style={{width:'100%', height:240, objectFit:'cover', borderRadius:6}} />
              <div className="mt-3">
                <div className="fw-semibold">{form.title || 'Product title'}</div>
                <div className="text-muted">₹{form.price || '0'}</div>
                <div className="small mt-2 text-muted">{(form.description || 'Short description').slice(0,120)}</div>
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
