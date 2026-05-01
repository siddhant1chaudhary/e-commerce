import { useState } from 'react';
import { useRouter } from 'next/router';
import Header from '../../components/Header';
import { useAuth } from '../../components/AuthProvider';

export default function ForgotPassword() {
	const [form, setForm] = useState({ email: '', otp: '', newPassword: '' });
	const [step, setStep] = useState('email'); // email -> otp
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const router = useRouter();
	const auth = useAuth();

	async function requestOtp(e) {
		e.preventDefault();
		setError('');
		setLoading(true);
		try {
			const res = await fetch('/api/auth/forgot-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: form.email })
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error || 'Could not request OTP');
			}
			setStep('otp');
		} catch (err) {
			setError(err.message || 'Could not request OTP');
		} finally {
			setLoading(false);
		}
	}

	async function verifyOtp(e) {
		e.preventDefault();
		setError('');
		setLoading(true);
		try {
			const res = await fetch('/api/auth/forgot-password/verify-otp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: form.email,
					otp: form.otp,
					newPassword: form.newPassword
				})
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
	}

	return (
		<div>
			<Header />
			<main className="container d-flex justify-content-center">
				<div className="w-100" style={{ maxWidth: 680, marginTop: 36 }}>
					<div className="card shadow-sm">
						<div style={{ background: 'linear-gradient(90deg,#ffefef,#fff4ee)', padding: 0 }}>
							<img
								src="/marketing/login-banner.jpg"
								alt="banner"
								style={{ width: '100%', display: 'block', objectFit: 'cover', height: 160 }}
								onError={(e) => {
									e.currentTarget.style.display = 'none';
								}}
							/>
						</div>
						<div className="card-body p-5">
							<h3 className="mb-4">{step === 'email' ? 'Reset your password' : 'Verify OTP'}</h3>

							{step === 'email' ? (
								<form onSubmit={requestOtp} className="mb-3">
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

									{error && <div className="alert alert-danger py-2">{error}</div>}

									<button
										type="submit"
										className="btn btn-lg w-100"
										style={{ background: '#ff3e6c', color: '#fff', fontWeight: 700 }}
										disabled={loading}
									>
										{loading ? 'Sending...' : 'SEND OTP'}
									</button>
								</form>
							) : (
								<form onSubmit={verifyOtp} className="mb-3">
									<div className="mb-3">
										<label className="form-label small text-muted">Enter OTP</label>
										<input
											value={form.otp}
											onChange={(e) => setForm({ ...form, otp: e.target.value })}
											className="form-control"
											placeholder="6-digit code"
											type="text"
											inputMode="numeric"
											required
											pattern="^[0-9]{6}$"
										/>
									</div>

									<div className="mb-3">
										<label className="form-label small text-muted">New Password</label>
										<input
											value={form.newPassword}
											onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
											className="form-control"
											placeholder="Choose a new password"
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
										{loading ? 'Verifying...' : 'RESET PASSWORD'}
									</button>
								</form>
							)}

							<div className="mt-3 text-muted small">
								Remembered your password? <a href="/auth/login">Login</a>
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}

