import Header from '../../components/Header';
import { useAuth } from '../../components/AuthProvider';
import { useToast } from '../../components/ToastProvider';
import useSWR from 'swr';
import Link from 'next/link';
import { useState } from 'react';
import { parseCookies, verifyToken } from '../../lib/auth';

const fetcher = (url) => fetch(url, { credentials: 'same-origin' }).then(r => r.json());

function statusToBadge(status) {
  if (status === 'placed') return { text: 'Placed', color: 'secondary', pct: 20 };
  if (status === 'in-progress') return { text: 'In Progress', color: 'info', pct: 40 };
  if (status === 'packed') return { text: 'Packed', color: 'primary', pct: 60 };
  if (status === 'shipped') return { text: 'Shipped', color: 'warning', pct: 80 };
  if (status === 'delivered') return { text: 'Delivered', color: 'success', pct: 100 };
  if (status === 'return-requested') return { text: 'Return Requested', color: 'warning', pct: 100 };
  if (status === 'return-in-progress') return { text: 'Return In Progress', color: 'info', pct: 40 };
  if (status === 'return-shipped') return { text: 'Return Shipped', color: 'warning', pct: 80 };
  if (status === 'return-delivered') return { text: 'Return Delivered', color: 'success', pct: 100 };
  return { text: String(status), color: 'secondary', pct: 0 };
}

function getReturnEligibility(order) {
	if (!order || order.status !== 'delivered') return { eligible: false, message: null, untilMs: null };
	// If the delivery timestamp is missing (older orders), we still allow the user
	// to click and let the backend enforce the 7-day window.
	const deliveredAtRaw = order.deliveredAt || order.updatedAt;
	if (!deliveredAtRaw) return { eligible: true, message: null, untilMs: null };

	const deliveredMs = new Date(deliveredAtRaw).getTime();
	if (Number.isNaN(deliveredMs)) return { eligible: false, message: 'Invalid delivery date', untilMs: null };

	const untilMs = deliveredMs + 7 * 24 * 60 * 60 * 1000;
	const eligible = Date.now() <= untilMs;
	return { eligible, message: eligible ? null : 'Return window expired', untilMs };
}

export default function MyOrders({ serverUser }) {
  const { user: clientUser } = useAuth() || {};
  const user = clientUser || serverUser;
  const toast = useToast();
  const [returningOrderId, setReturningOrderId] = useState(null);

  const { data: orders, error, mutate } = useSWR('/api/orders', fetcher);

  if (!user) {
    return (
      <div>
        <Header />
        <main className="container py-5">
          <h1>My Orders</h1>
          <div className="alert alert-warning">Please <Link href="/auth/login" legacyBehavior><a>login</a></Link> to view your orders.</div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header />
        <main className="container py-5">
          <h1>My Orders</h1>
          <div className="alert alert-danger">Failed to load orders</div>
        </main>
      </div>
    );
  }

  async function requestReturn(order) {
		if (!order?.id) return;
		const eligibility = getReturnEligibility(order);
		if (!eligibility.eligible) {
			toast?.show({ type: 'error', message: eligibility.message || 'Return not available' });
			return;
		}

		if (order.returnRequest && order.returnRequest.status && order.returnRequest.status !== 'rejected') {
			toast?.show({ type: 'info', message: 'Return already requested' });
			return;
		}

		const reason = prompt('Reason for return (optional):') || '';
		setReturningOrderId(order.id);
		try {
			const res = await fetch(`/api/orders/${order.id}/return`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'same-origin',
				body: JSON.stringify({ reason })
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error || 'Return request failed');
			}
			toast?.show({ type: 'success', message: 'Return request submitted' });
			mutate();
		} catch (err) {
			toast?.show({ type: 'error', message: err.message || 'Return request failed' });
		} finally {
			setReturningOrderId(null);
		}
  }

  return (
    <div>
      <Header />
      <main className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="h4 mb-0">My Orders</h1>
          <div>
            <button className="btn btn-outline-secondary me-2" onClick={() => mutate()}>Refresh</button>
            <Link href="/" legacyBehavior><a className="btn btn-primary">Shop more</a></Link>
          </div>
        </div>

        {!orders || orders.length === 0 ? (
          <div className="card p-4 text-center">
            <div className="mb-2">You have no orders yet.</div>
            <Link href="/" legacyBehavior><a className="btn btn-primary">Start shopping</a></Link>
          </div>
        ) : (
          <div className="row g-3">
            {orders.map(order => {
              const badge = statusToBadge(order.status || 'placed');
              return (
                <div key={order.id} className="col-12">
                  <div className="card shadow-sm">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <div className="small text-muted">Order ID</div>
                          <div className="fw-semibold">{order.id}</div>
                          <div className="small text-muted">{new Date(order.createdAt).toLocaleString()}</div>
                        </div>
                        <div className="text-end">
                          <span className={`badge bg-${badge.color} mb-2`}>{badge.text}</span>
                          <div className="small text-muted">Total ₹{(order.total||0).toFixed(2)}</div>
                        </div>
                      </div>

                      <div className="mt-3">
                        {/* progress bar visual */}
                        <div className="progress" style={{height:10, borderRadius:6}}>
                          <div className="progress-bar" role="progressbar" style={{ width: `${badge.pct}%` }} aria-valuenow={badge.pct} aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                      </div>

                      <div className="mt-3 d-flex justify-content-between align-items-center">
                        <div>
                          <button className="btn btn-sm btn-outline-primary me-2" data-bs-toggle="collapse" data-bs-target={`#items-${order.id}`}>Items ({order.items.length})</button>
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => toast?.show({ type: 'info', message: 'Tracking not implemented — simulated status shown' })}>Track</button>
                        </div>

                        <div className="d-flex align-items-center gap-2">
						  {(() => {
								const eligibility = getReturnEligibility(order);
								const hasRequested = !!(order.returnRequest && order.returnRequest.status && order.returnRequest.status !== 'rejected');
								if (!eligibility.eligible || hasRequested) return null;
								return (
									<button
										className="btn btn-sm btn-outline-danger"
										disabled={returningOrderId === order.id}
										onClick={() => requestReturn(order)}
									>
										Request Return
									</button>
								);
							})()}

							{(order.status === 'delivered' ||
                order.status === 'return-requested' ||
                order.status === 'return-in-progress' ||
                order.status === 'return-shipped' ||
                order.status === 'return-delivered') && (
								<Link href={`/order/invoice/${order.id}`} legacyBehavior>
									<a className="btn btn-sm btn-outline-success">Invoice</a>
								</Link>
							)}

							<Link href={`/order/${order.id}`} legacyBehavior><a className="btn btn-sm btn-primary">View Details</a></Link>
                        </div>
                      </div>

                      <div className="collapse mt-3" id={`items-${order.id}`}>
                        <div className="list-group">
                          {order.items.map(it => (
                            <div key={it.productId} className="list-group-item d-flex align-items-center">
                              <img src={it.image || '/images/placeholder.png'} alt={it.title} style={{width:72,height:72,objectFit:'cover',borderRadius:6}} />
                              <div className="ms-3 flex-grow-1">
                                <div className="fw-semibold">{it.title}</div>
                                <div className="small text-muted">Qty {it.qty} • ₹{it.price}</div>
                              </div>
                              <div>₹{(it.price * it.qty).toFixed(2)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export async function getServerSideProps({ req }) {
  const cookies = parseCookies(req);
  const token = cookies['token'];
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false
      }
    };
  }

  const serverUser = { id: payload.sub, role: payload.role, name: payload.name || null };
  return { props: { serverUser } };
}
