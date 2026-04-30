import { useRouter } from 'next/router';
import useSWR from 'swr';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../../components/Header';
import ProductList from '../../components/ProductList';
import { SHOP_BY_AGE_GROUPS } from '../../lib/ageGroups';

async function shopByAgeFetcher(url) {
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) {
    const msg = body?.message || body?.error || 'Failed to load products';
    const err = new Error(msg);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export default function ShopByAgeListingPage() {
  const router = useRouter();
  const raw = router.query.age;
  const ageSlug = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';

  const apiUrl =
    router.isReady && ageSlug
      ? `/api/products/shop-by-age?age=${encodeURIComponent(ageSlug)}`
      : null;

  const { data, error, isLoading } = useSWR(apiUrl, shopByAgeFetcher, { revalidateOnFocus: false });

  const meta = SHOP_BY_AGE_GROUPS.find((g) => g.value === data?.age);
  const pageTitle = data?.age ? `Shop by Age — ${meta?.label || data.age}` : 'Shop by Age';

  if (!router.isReady) {
    return (
      <div>
        <Header />
        <main className="container py-4">Loading…</main>
      </div>
    );
  }

  if (!ageSlug) {
    return (
      <div>
        <Header />
        <main className="container py-4">
          <p className="text-muted">Invalid link.</p>
          <Link href="/">Back to home</Link>
        </main>
      </div>
    );
  }

  return (
    <div>
      <Head>
        <title>{`${pageTitle} | TimTom`}</title>
      </Head>
      <Header />
      <main className="container py-4">
        <nav className="mb-3 small">
          <Link href="/" legacyBehavior>
            <a className="text-muted text-decoration-none">Home</a>
          </Link>
          <span className="text-muted"> / </span>
          <span className="text-muted">Shop by Age</span>
          {data?.age && (
            <>
              <span className="text-muted"> / </span>
              <span>{meta?.label || data.age}</span>
            </>
          )}
        </nav>

        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
          <div>
            <h1 className="h4 mb-1">{pageTitle}</h1>
            {meta?.description && <p className="small text-muted mb-0">{meta.description}</p>}
          </div>
          <div className="d-flex flex-wrap gap-1">
            {SHOP_BY_AGE_GROUPS.map((g) => (
              <Link key={g.value} href={`/shop-by-age/${encodeURIComponent(g.value)}`} legacyBehavior>
                <a
                  className={`btn btn-sm ${
                    data?.age === g.value ? 'btn-primary' : 'btn-outline-secondary'
                  }`}
                >
                  {g.label}
                </a>
              </Link>
            ))}
          </div>
        </div>

        {isLoading && !data && !error && <div className="text-muted">Loading products…</div>}
        {error && (
          <div className="alert alert-danger">
            {error.message}
            {error.body?.ageGroups && (
              <div className="small mt-2">
                Try:{' '}
                {error.body.ageGroups.map((g) => g.value).join(', ')}
              </div>
            )}
          </div>
        )}
        {data && <ProductList products={data.products} />}
      </main>
    </div>
  );
}
