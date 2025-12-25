import Header from '../../../components/Header';
import { useAuth } from '../../../components/AuthProvider';
import { parseCookies, verifyToken } from '../../../lib/auth';
import useSWR from 'swr';
import Link from 'next/link';
import { useToast } from '../../../components/ToastProvider';
import { useState } from 'react';

const fetcher = (url) => fetch(url).then(r => r.json());

export default function AdminDashboard({ serverUser }) {
	const { user: clientUser } = useAuth();
	const user = clientUser || serverUser;
	const toast = useToast();

	const { data: products } = useSWR('/api/products', fetcher);
	const { data: orders, mutate: refreshOrders } = useSWR('/api/orders/admin', fetcher);
	const { data: userCountData } = useSWR('/api/users/count', (url) => fetch(url).then((res) => res.json()));
	const [updatingOrderId, setUpdatingOrderId] = useState(null);

	const totalUsers = userCountData?.totalUsers || 0;

	if (!user) {
		return (
			<div>
				<Header />
				<main className="container py-5">
					<h1>Admin Dashboard</h1>
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
					<h1>Admin Dashboard</h1>
					<div className="alert alert-danger">User is not authorized to view this page.</div>
				</main>
			</div>
		);
	}

	const totalProducts = products ? products.length : 0;
	const recent = products ? products.slice(0,4) : [];

	async function updateOrderStatus(orderId, status) {
		setUpdatingOrderId(orderId);
		try {
			const body = { id: orderId, status };

			// If the status is "canceled", include the canceledBy field
			if (status === 'canceled') {
				body.canceledBy = { role: 'admin', name: user.name || 'Admin' };
			}

			const res = await fetch('/api/orders/admin', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Failed to update order');
			}

			await refreshOrders();
		} catch (err) {
			console.error(err.message);
		} finally {
			setUpdatingOrderId(null);
		}
	}

	return (
		<div>
			<Header />
			<main className="container py-4">
				<div className="d-flex justify-content-between align-items-center mb-4">
					<h1 className="h4 mb-0">Admin Dashboard</h1>
					<div>
						<Link href="/admin/products" legacyBehavior><a className="btn btn-outline-secondary me-2">Products</a></Link>
						<Link href="/admin/products/new" legacyBehavior><a className="btn btn-primary">Add product</a></Link>
					</div>
				</div>

				<div className="row g-3 mb-4">
					<div className="col-sm-6 col-md-3">
						<div className="card p-3 h-100">
							<div className="small text-muted">Total products</div>
							<div className="h5 fw-bold">{totalProducts}</div>
						</div>
					</div>

					<div className="col-sm-6 col-md-3">
						<div className="card p-3 h-100">
							<div className="small text-muted">Active admins</div>
							<div className="h5 fw-bold">1</div>
						</div>
					</div>

					<div className="col-sm-6 col-md-3">
						<div className="card p-3 h-100">
							<div className="small text-muted">Recent adds</div>
							<div className="h5 fw-bold">{recent.length}</div>
						</div>
					</div>

					<div className="col-sm-6 col-md-3">
						<div className="card p-3 h-100">
							<div className="small text-muted">Quick actions</div>
							<div className="mt-2">
								<button className="btn btn-sm btn-outline-primary me-2" onClick={() => toast?.show({ type: 'info', message: 'Not implemented' })}>Export</button>
								<button className="btn btn-sm btn-outline-secondary" onClick={() => toast?.show({ type: 'info', message: 'Not implemented' })}>Settings</button>
							</div>
						</div>
					</div>

					<div className="col-sm-6 col-md-3">
						<div className="card p-3 h-100">
							<div className="small text-muted">Total users</div>
							<div className="h5 fw-bold">{totalUsers}</div>
						</div>
					</div>
				</div>

				<div className="card p-3 mb-4">
					<div className="d-flex justify-content-between align-items-center mb-3">
						<h5 className="mb-0">Recent products</h5>
						<Link href="/admin/products" legacyBehavior><a className="small">View all</a></Link>
					</div>

					<div className="row g-3">
						{recent.map(p => (
							<div key={p.id} className="col-6 col-md-3">
								<div className="card h-100">
									<img src={p.image || '/images/placeholder.png'} alt={p.title} style={{height:140, objectFit:'cover'}} />
									<div className="p-2">
										<div className="small fw-semibold">{p.title}</div>
										<div className="text-muted small">₹{p.price}</div>
									</div>
								</div>
							</div>
						))}
						{recent.length === 0 && <div className="col-12"><div className="text-muted">No products yet</div></div>}
					</div>
				</div>

				<div className="card p-3">
					<h5 className="mb-3">Orders</h5>
					<div className="table-responsive">
						<table className="table">
							<thead>
								<tr>
									<th>ID</th>
									<th>User</th>
									<th>Status</th>
									<th>Canceled By</th>
									<th>Total</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{orders?.length && orders?.map(order => (
									<tr key={order.id}>
										<td>
											<Link href={`/admin/orders/${order.id}`} legacyBehavior>
												<a className="text-decoration-none">{order.id}</a>
											</Link>
										</td>
										<td>{order.userId || 'Guest'}</td>
										<td>
											<span
												className={`badge ${
													order.status === 'canceled'
														? 'bg-danger'
														: order.status === 'delivered'
														? 'bg-success'
														: 'bg-warning text-dark'
												}`}
											>
												{order.status}
											</span>
										</td>
										<td>
											{typeof order.canceledBy === 'object'
												? `${order.canceledBy.role === 'admin' ? 'Admin' : 'User'} (${order.canceledBy.name || 'Unknown'})`
												: order.canceledBy || 'N/A'}
										</td>
										<td>₹{order.total.toFixed(2)}</td>
										<td>
											<select
												className="form-select form-select-sm"
												value={order.status}
												onChange={(e) => updateOrderStatus(order.id, e.target.value)}
												disabled={updatingOrderId === order.id}
											>
												<option value="placed">Placed</option>
												<option value="in-progress">In Progress</option>
												<option value="shipped">Shipped</option>
												<option value="delivered">Delivered</option>
												<option value="canceled">Canceled</option>
											</select>
										</td>
									</tr>
								))}
								{!orders?.length && (
									<tr>
										<td colSpan="6" className="text-center text-muted">No orders found</td>
									</tr>
								)}
							</tbody>
						</table>
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
