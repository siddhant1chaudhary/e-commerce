import Header from '../../../components/Header';
import { useAuth } from '../../../components/AuthProvider';
import { parseCookies, verifyToken } from '../../../lib/auth';
import useSWR from 'swr';
import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';

const PAGE_SIZE = 25;

const fetcher = (url) =>
  fetch(url, { credentials: 'same-origin' }).then((r) => {
    if (!r.ok) throw new Error('Failed to load users');
    return r.json();
  });

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return '—';
  }
}

export default function AdminUsers({ serverUser }) {
  const { user: clientUser } = useAuth();
  const user = clientUser || serverUser;
  const [page, setPage] = useState(1);

  const listUrl = useMemo(() => {
    if (!user || user.role !== 'admin') return null;
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('limit', String(PAGE_SIZE));
    return `/api/users/admin?${p.toString()}`;
  }, [user, page]);

  const { data, error, isLoading } = useSWR(listUrl, fetcher);

  // Keep in sync when API clamps page (e.g. after total shrinks)
  useEffect(() => {
    if (data?.page != null && data.page !== page) {
      setPage(data.page);
    }
  }, [data?.page, page]);

  if (!user) {
    return (
      <div>
        <Header />
        <main className="container py-5">
          <h1>Users</h1>
          <div className="alert alert-warning">
            Please login to access admin pages. <a href="/auth/login">Login</a>
          </div>
        </main>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div>
        <Header />
        <main className="container py-5">
          <h1>Users</h1>
          <div className="alert alert-danger">You are not authorized to view this page.</div>
        </main>
      </div>
    );
  }

  const rows = data?.users || [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ?? page;
  const from = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, total);

  return (
    <div>
      <Header />
      <main className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <h1 className="h4 mb-0">All users</h1>
          <div className="d-flex flex-wrap gap-2">
            <Link href="/admin/guest-visitors" legacyBehavior>
              <a className="btn btn-outline-secondary">Guest visitors</a>
            </Link>
            <Link href="/admin/dashboard" legacyBehavior>
              <a className="btn btn-outline-secondary">Back to dashboard</a>
            </Link>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger">Could not load users. Try again.</div>
        )}

        {isLoading && <div className="text-muted">Loading…</div>}

        {!isLoading && !error && (
          <>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
              <div className="text-muted small">
                {total > 0 ? (
                  <>
                    Showing {from}–{to} of {total} users
                  </>
                ) : (
                  'No users'
                )}
              </div>
            </div>

            <div className="card p-0 overflow-hidden">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>First name</th>
                      <th>Last name</th>
                      <th>Email</th>
                      <th>Account created</th>
                      <th>Last active</th>
                      <th className="text-end">Total orders</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((u) => (
                      <tr key={u.id}>
                        <td>{u.firstName || '—'}</td>
                        <td>{u.lastName || '—'}</td>
                        <td>{u.email || '—'}</td>
                        <td className="text-nowrap small">{formatWhen(u.createdAt)}</td>
                        <td className="text-nowrap small">{formatWhen(u.lastActiveAt)}</td>
                        <td className="text-end">{u.totalOrders}</td>
                        <td>
                          <span className="badge bg-secondary">{u.role}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length === 0 && (
                <div className="p-4 text-center text-muted">No users found</div>
              )}
            </div>

            {totalPages > 1 && (
              <nav className="mt-3" aria-label="Users pagination">
                <ul className="pagination justify-content-center flex-wrap mb-0">
                  <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                    >
                      Previous
                    </button>
                  </li>
                  <li className="page-item disabled d-none d-sm-block">
                    <span className="page-link text-body">
                      Page {currentPage} of {totalPages}
                    </span>
                  </li>
                  <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={currentPage >= totalPages}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export async function getServerSideProps({ req }) {
  const cookies = parseCookies(req);
  const token = cookies['token'];
  const payload = token ? verifyToken(token) : null;
  const serverUser = payload
    ? { id: payload.sub, role: payload.role, name: payload.name || null }
    : null;
  return { props: { serverUser } };
}
