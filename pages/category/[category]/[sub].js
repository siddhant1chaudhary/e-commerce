import { useRouter } from 'next/router';
import useSWR from 'swr';
import Header from '../../../components/Header';
import ProductList from '../../../components/ProductList';
import navHeader from '../../../data/navHeader.json';
import Link from 'next/link';
import { useMemo } from 'react';
import Head from 'next/head';

// small slug helper used for fallback slugs
const toSlug = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');

const fetcher = (url) => fetch(url).then(r => r.json());

export default function CategorySubPage() {
  const router = useRouter();
  // accept params from route (sub) — may arrive via rewrite from /:category/:sub
  const { category, sub } = router.query; // sub can be 'all' or specific
  const ageFromQuery = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('age') || '') : '';

  // find category object from navHeader (case-insensitive match)
  const catObj = useMemo(() => {
    if (!category) return null;
    const catLower = String(category).toLowerCase();
    return (
      navHeader.find((c) =>
        [c.title, c.slug, c.subTitle].some((v) => v && String(v).toLowerCase() === catLower)
      ) || null
    );
  }, [category]);

  // stable slug to pass to API and use in hrefs: prefer explicit slug/id from nav data, fallback to slugified category text
  const catSlug = catObj?.slug || catObj?.subTitle || toSlug(category || '');
  const subParam = sub && sub !== 'all' ? sub : '';
  const ageParam = ageFromQuery || '';

  // build API url with chosen filters
  const buildKey = () => {
    if (!category) return null;
    const params = new URLSearchParams();
    params.set('category', catSlug);
    if (subParam) params.set('subCategory', subParam);
    if (ageParam) params.set('ageGroup', ageParam);
    const q = params.toString();
    return q ? `/api/products?${q}` : '/api/products';
  };

  const { data: products, error, mutate } = useSWR(buildKey, fetcher, { revalidateOnFocus: false });

  if (!category || !sub) return <div>Loading...</div>;

  return (
    <div>
      <Head>
        <title>{`${sub} — ${category} | TimTom`}</title>
      </Head>

      <Header />
      <main className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h1 className="h4 mb-0">{catObj?.title || 'Category'}</h1>
            {/* <div className="small text-muted">{catObj?.title ? `Browse ${catObj.title}` : ''}</div> */}
          </div>
          <div className="d-flex gap-2">
            <Link href={`/${encodeURIComponent(catSlug)}/all`} legacyBehavior>
              <a className={`btn btn-sm ${!subParam ? 'btn-primary' : 'btn-outline-secondary'}`}>All</a>
            </Link>
            {catObj?.items?.map((it) => {
              const title = it.subTitle || it.label;
              return (
                <Link
                  key={title}
                  href={`/${encodeURIComponent(catSlug)}/${encodeURIComponent(title)}`}
                  legacyBehavior
                >
                  <a className={`btn btn-sm ${subParam === title ? 'btn-primary' : 'btn-outline-secondary'}`}>{title}</a>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mb-3 d-flex gap-2 align-items-center">
          <label className="small mb-0 me-2">Shop by Age:</label>
          <Link href={`/${encodeURIComponent(catSlug)}/${subParam || 'all'}?age=`} legacyBehavior>
            <a className={`btn btn-sm btn-outline-secondary`}>All</a>
          </Link>
          <Link href={`/${encodeURIComponent(catSlug)}/${subParam || 'all'}?age=Newborn`} legacyBehavior>
            <a className="btn btn-sm btn-outline-secondary">Newborn</a>
          </Link>
          <Link href={`/${encodeURIComponent(catSlug)}/${subParam || 'all'}?age=Infants`} legacyBehavior>
            <a className="btn btn-sm btn-outline-secondary">Infants</a>
          </Link>
          <Link href={`/${encodeURIComponent(catSlug)}/${subParam || 'all'}?age=Toddlers`} legacyBehavior>
            <a className="btn btn-sm btn-outline-secondary">Toddlers</a>
          </Link>
          <Link href={`/${encodeURIComponent(catSlug)}/${subParam || 'all'}?age=Juniors`} legacyBehavior>
            <a className="btn btn-sm btn-outline-secondary">Juniors</a>
          </Link>
        </div>

        <section>
          {error && <div className="alert alert-danger">Failed to load products.</div>}
          {!products && !error && <div>Loading products...</div>}
          {products && <ProductList products={products} />}
        </section>
      </main>
    </div>
  );
}
