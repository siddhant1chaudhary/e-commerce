import { useState } from 'react';
import { useRouter } from 'next/router';
import Header from '../../components/Header';
import { useAuth } from '../../components/AuthProvider';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Login failed');
      }
      const user = await res.json();
      auth.login(user);
      if (user.role === 'admin') router.push('/admin/dashboard');
      else router.push('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Header />
      <main className="container d-flex justify-content-center">
        <div className="w-100" style={{ maxWidth: 680, marginTop: 36 }}>
          <div className="card shadow-sm">
            {/* Banner area */}
            <div style={{ background: 'linear-gradient(90deg,#ffefef,#fff4ee)', padding: 0 }}>
              <img src="/images/login-banner.jpg" alt="banner" style={{ width: '100%', display: 'block', objectFit: 'cover', height: 160 }} onError={(e)=>{e.currentTarget.style.display='none'}} />
            </div>

            <div className="card-body p-5">
              <h3 className="mb-4">Login to your account</h3>

              <form onSubmit={submit} className="mb-3">
                <div className="mb-3">
                  <label className="form-label small text-muted">Email or Mobile Number</label>
                  <input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="form-control"
                    placeholder="Enter email or mobile"
                    type="text"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small text-muted">Password</label>
                  <input
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="form-control"
                    placeholder="Password"
                    type="password"
                    required
                  />
                </div>

                {error && <div className="alert alert-danger py-2">{error}</div>}

                <button type="submit" className="btn btn-lg w-100" style={{ background: '#ff3e6c', color: '#fff', fontWeight: 700 }} disabled={loading}>
                  {loading ? 'Please wait...' : 'LOGIN'}
                </button>
              </form>

              <div className="mt-3">
                <a href="/auth/signup" className="text-decoration-none">Create an account</a>
                <div className="text-muted small mt-2">Forgot your password? <a href="#" className="text-danger">Reset here</a></div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
