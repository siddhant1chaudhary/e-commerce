import useSWR from 'swr';
import Link from 'next/link';
import Header from '../../../components/Header';
import { useAuth } from '../../../components/AuthProvider';
import { parseCookies, verifyToken } from '../../../lib/auth';
import { useToast } from '../../../components/ToastProvider';
import { useState, useMemo } from 'react';
import navHeader from '../../../data/navHeader.json';

const fetcher = (url) => fetch(url).then((r) => r.json());

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const matches = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[]\/+^])/g, '\\$1') + '=([^;]*)'));
  return matches ? decodeURIComponent(matches[1]) : null;
}

export default function AdminProducts({ serverUser }) {
  const { user: clientUser } = useAuth();
  const user = clientUser || serverUser;
  const toast = useToast();

  if (!user) {
    return (
      <div>
        <Header />
        <main className="container py-5">
          <h1>Admin — Products</h1>
          <div className="alert alert-warning">Please login to access admin pages. <Link href="/auth/login" legacyBehavior><a>Login</a></Link></div>
        </main>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div>
        <Header />
        <main className="container py-5">
          <h1>Admin — Products</h1>
          <div className="alert alert-danger">User is not authorized to view this page.</div>
        </main>
      </div>
    );
  }

  // filter state
  const [category, setCategory] = useState(() => (navHeader && navHeader[0] ? navHeader[0].title : ''));
  const currentCatObj = useMemo(() => navHeader.find(c => c.title === category) || null, [category]);
  const [subCategory, setSubCategory] = useState(() => (currentCatObj && currentCatObj.items && currentCatObj.items[0] ? currentCatObj.items[0].label : ''));
  const [ageGroup, setAgeGroup] = useState(''); // '' = all

  // derived subOptions
  const subOptions = useMemo(() => (currentCatObj && Array.isArray(currentCatObj.items) ? currentCatObj.items.map(i => i.label) : []), [currentCatObj]);

  // build SWR key with query params (omit empty params)
  const buildProductsKey = () => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (subCategory) params.set('subCategory', subCategory);
    if (ageGroup) params.set('ageGroup', ageGroup);
    const q = params.toString();
    return q ? `/api/products?${q}` : '/api/products';
  };

  // fetch filtered products from API
  const { data: products, mutate } = useSWR(buildProductsKey, fetcher);

  async function handleDelete(id) {
    if (!confirm('Delete product?')) return;
    const csrf = getCookie('csrf') || '';
    const res = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers: { 'x-csrf-token': csrf },
      credentials: 'same-origin'
    });
    if (!res.ok) {
      const err = await res.json().catch(()=>({error:res.statusText}));
      toast?.show({ type: 'error', message: err.error || 'Delete failed' });
      return;
    }
    toast?.show({ type: 'success', message: 'Product deleted' });
    mutate();
  }

  return (
    <div>
      <Header />
      <main className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="h4 mb-0">Products</h1>
          <div className="d-flex align-items-center gap-2">
            {/* category / subcategory / age filters */}
            <select className="form-select form-select-sm me-2" style={{width:160}} value={category} onChange={(e) => { setCategory(e.target.value); const cat = navHeader.find(c=>c.title===e.target.value); setSubCategory(cat && cat.items && cat.items[0] ? cat.items[0].label : ''); }}>
              {navHeader.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}
            </select>

            <select className="form-select form-select-sm me-2" style={{width:180}} value={subCategory} onChange={(e)=>setSubCategory(e.target.value)}>
              <option value=''>All Sub</option>
              {subOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select className="form-select form-select-sm me-2" style={{width:140}} value={ageGroup} onChange={(e)=>setAgeGroup(e.target.value)}>
              <option value=''>All Ages</option>
              <option value="Newborn">Newborn</option>
              <option value="Infants">Infants</option>
              <option value="Toddlers">Toddlers</option>
              <option value="Juniors">Juniors</option>
            </select>

            <Link href="/admin/products/new" legacyBehavior><a className="btn btn-primary me-2">Add product</a></Link>
            <button className="btn btn-outline-secondary" onClick={() => mutate()}>Refresh</button>
          </div>
        </div>

        <div className="row g-3">
          {(!products || products.length === 0) && <div className="col-12"><div className="alert alert-info">No products match the selected filters.</div></div>}
          {(products || []).map((p) => (
            <div key={p.id || p._id} className="col-6 col-md-4 col-lg-3">
              <div className="card h-100 shadow-sm">
                <img src={p.mainImage || p.image || '/images/placeholder.png'} className="card-img-top" style={{height:220, objectFit:'cover'}} alt={p.title} />
                <div className="card-body d-flex flex-column">
                  <h6 className="mb-1" style={{minHeight: '2.2rem'}}>{p.title}</h6>
                  <div className="mb-2 text-muted">
                    { (p.discountPrice ?? p.price) ? `₹${p.discountPrice ?? p.price}` : '₹0' }
                    <div className="small text-muted">{p.category || ''} / {p.subCategory || ''} {p.ageGroup ? `• Age: ${p.ageGroup}` : ''}</div>
                    <div className="small text-muted">Seller: {p.seller?.sellerName || (typeof p.seller === 'string' ? p.seller : '—')}</div>
                  </div>
                  <div className="mt-auto d-flex gap-2">
                    <Link href={`/product/${p.id || p._id}`} legacyBehavior>
                      <a className="btn btn-sm btn-outline-secondary flex-grow-1">View</a>
                    </Link>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id)}>Delete</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
