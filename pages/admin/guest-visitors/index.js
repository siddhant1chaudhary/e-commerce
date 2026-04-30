import Header from '../../../components/Header';
import { useAuth } from '../../../components/AuthProvider';
import { parseCookies, verifyToken } from '../../../lib/auth';
import useSWR from 'swr';
import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';

const PAGE_SIZE = 25;

const fetcher = (url) =>
  fetch(url, { credentials: 'same-origin' }).then((r) => {
    if (!r.ok) throw new Error('Failed to load guest visitors');
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

function formatDuration(ms) {
  const n = typeof ms === 'number' && ms > 0 ? ms : 0;
  const sec = Math.floor(n / 1000);
  const m = Math.floor(sec / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${sec % 60}s`;
  return `${sec}s`;
}

export default function AdminGuestVisitors({ serverUser }) {
  const { user: clientUser } = useAuth();
  const user = clientUser || serverUser;
  const [page, setPage] = useState(1);

  const listUrl = useMemo(() => {
    if (!user || user.role !== 'admin') return null;
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('limit', String(PAGE_SIZE));
    return `/api/admin/guest-visitors?${p.toString()}`;
  }, [user, page]);

  const { data, error, isLoading } = useSWR(listUrl, fetcher);

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
          <h1>Guest visitors</h1>
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
          <h1>Guest visitors</h1>
          <div className="alert alert-danger">You are not authorized to view this page.</div>
        </main>
      </div>
    );
  }

  const rows = data?.visitors || [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ?? page;
  const from = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, total);

  return (
    <div>
      <Header />
      <main className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <h1 className="h4 mb-0">Guest visitors</h1>
          <div className="d-flex flex-wrap gap-2">
            <Link href="/admin/users" legacyBehavior>
              <a className="btn btn-outline-secondary">Registered users</a>
            </Link>
            <Link href="/admin/dashboard" legacyBehavior>
              <a className="btn btn-outline-secondary">Dashboard</a>
            </Link>
          </div>
        </div>

        <p className="text-muted small mb-4">
          Anonymous storefront sessions (no login): browser id stored in localStorage, IP and optional
          country from hosting headers, language, timezone, and screen size from the browser without
          permission prompts. Precise GPS is not collected. Production sites should disclose this in
          a privacy policy and follow local law.
        </p>

        {error && (
          <div className="alert alert-danger">Could not load guest visitors. Try again.</div>
        )}

        {isLoading && <div className="text-muted">Loading…</div>}

        {!isLoading && !error && (
          <>
            <div className="text-muted small mb-2">
              {total > 0 ? (
                <>
                  Showing {from}–{to} of {total}
                </>
              ) : (
                'No guest sessions recorded yet'
              )}
            </div>

            <div className="card p-0 overflow-hidden">
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Browser id</th>
                      <th>First seen</th>
                      <th>Last seen</th>
                      <th>Time on site</th>
                      <th>Pages</th>
                      <th>IP</th>
                      <th>Country</th>
                      <th>Timezone</th>
                      <th>Language</th>
                      <th>Screen</th>
                      <th>Platform</th>
                      <th>Last path</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((v) => (
                      <tr key={v.visitorId}>
                        <td className="small font-monospace text-break" style={{ maxWidth: 140 }} title={v.visitorId}>
                          {v.visitorId ? `${v.visitorId.slice(0, 8)}…` : '—'}
                        </td>
                        <td className="text-nowrap small">{formatWhen(v.firstSeenAt)}</td>
                        <td className="text-nowrap small">{formatWhen(v.lastSeenAt)}</td>
                        <td className="text-nowrap small">{formatDuration(v.totalActiveMs)}</td>
                        <td className="text-end">{v.pageViews}</td>
                        <td className="small text-break">{v.ip || '—'}</td>
                        <td>{v.ipCountry || '—'}</td>
                        <td className="small">{v.timezone || '—'}</td>
                        <td className="small">{v.language || '—'}</td>
                        <td className="small">{v.screen || '—'}</td>
                        <td className="small">{v.platform || '—'}</td>
                        <td className="small text-break" style={{ maxWidth: 160 }}>
                          {v.lastPath || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length === 0 && (
                <div className="p-4 text-center text-muted">
                  Browse the shop while logged out to create sample rows.
                </div>
              )}
            </div>

            <details className="mt-3 small text-muted">
              <summary className="cursor-pointer">User agent &amp; referrer</summary>
              <div className="table-responsive mt-2">
                <table className="table table-sm table-bordered bg-white">
                  <thead>
                    <tr>
                      <th>Browser id</th>
                      <th>User agent</th>
                      <th>Entry referrer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((v) => (
                      <tr key={`${v.visitorId}-detail`}>
                        <td className="font-monospace small">{v.visitorId?.slice(0, 8)}…</td>
                        <td className="small text-break">{v.userAgent || '—'}</td>
                        <td className="small text-break">{v.referrer || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>

            {totalPages > 1 && (
              <nav className="mt-3" aria-label="Pagination">
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
