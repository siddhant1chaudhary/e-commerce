import { useState } from 'react';
import { useRouter } from 'next/router';
import Header from '../../components/Header';
import { useAuth } from '../../components/AuthProvider';

export default function SignUp() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('details'); // 'details' -> 'otp'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();

  async function submitDetails(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Signup failed');
      }

      setStep('otp');
    } catch (err) {
      setError(err.message || 'Signup failed');
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
            <div style={{ background: 'linear-gradient(90deg,#ffefef,#fff4ee)', padding: 0 }}>
              <img src="/images/login-banner.jpg" alt="banner" style={{ width: '100%', display: 'block', objectFit: 'cover', height: 160 }} onError={(e)=>{e.currentTarget.style.display='none'}} />
            </div>

            <div className="card-body p-5">
              <h3 className="mb-4">{step === 'details' ? 'Create an account' : 'Verify OTP'}</h3>

              {step === 'details' ? (
                <form onSubmit={submitDetails} className="mb-3">
                  <div className="mb-3">
                    <label className="form-label small text-muted">Name</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="form-control"
                      placeholder="Full name"
                      type="text"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small text-muted">Email</label>
                    <input
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="form-control"
                      placeholder="you@example.com"
                      type="email"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small text-muted">Password</label>
                    <input
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="form-control"
                      placeholder="Choose a password"
                      type="password"
                      required
                    />
                  </div>

                  {error && <div className="alert alert-danger py-2">{error}</div>}

                  <button
                    type="submit"
                    className="btn btn-lg w-100"
                    style={{ background: '#ff3e6c', color: '#fff', fontWeight: 700 }}
                    disabled={loading}
                  >
                    {loading ? 'Creating...' : 'CONTINUE'}
                  </button>
                </form>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setError('');
                    setLoading(true);
                    try {
                      const res = await fetch('/api/auth/signup/verify-otp', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: form.email, otp }),
                      });
                      if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        throw new Error(data.error || 'OTP verification failed');
                      }
                      const user = await res.json();
                      auth.login(user);
                      router.push('/');
                    } catch (err) {
                      setError(err.message || 'OTP verification failed');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="mb-3"
                >
                  <div className="mb-3">
                    <label className="form-label small text-muted">Enter OTP</label>
                    <input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="form-control"
                      placeholder="6-digit code"
                      type="text"
                      inputMode="numeric"
                      required
                      pattern="^[0-9]{6}$"
                    />
                  </div>

                  {error && <div className="alert alert-danger py-2">{error}</div>}

                  <button
                    type="submit"
                    className="btn btn-lg w-100"
                    style={{ background: '#ff3e6c', color: '#fff', fontWeight: 700 }}
                    disabled={loading}
                  >
                    {loading ? 'Verifying...' : 'VERIFY & SIGN IN'}
                  </button>

                  <div className="mt-3 text-muted small">
                    Didn&apos;t receive the code? Re-submit your details to request a new OTP.
                  </div>
                </form>
              )}

              <div className="mt-3 text-muted small">
                By continuing, I agree to the <a href="#" className="text-danger">Terms of Use</a> &{' '}
                <a href="#" className="text-danger">Privacy Policy</a>.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
