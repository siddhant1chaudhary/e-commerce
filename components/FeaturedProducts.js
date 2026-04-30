import useSWR from 'swr';
import Link from 'next/link';
import { useMemo } from 'react';
import ProductCard from './ProductCard';

const fetcher = (url) => fetch(url).then(r => r.json());

function sortKey(p) {
  const t = p?.createdAt ? new Date(p.createdAt).getTime() : NaN;
  if (Number.isFinite(t)) return t;
  const n = Number.parseInt(String(p?.id || '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

export default function FeaturedProducts({
  title = 'Trending now',
  limit = 8,
  orderDirection = 'desc',
}) {
  const { data: products } = useSWR('/api/products', fetcher);

  const items = useMemo(() => {
    if (!Array.isArray(products) || products.length === 0) return [];
    const dir = orderDirection === 'asc' ? 1 : -1;
    return [...products]
      .sort((a, b) => dir * (sortKey(a) - sortKey(b)))
      .slice(0, Math.max(0, Number(limit) || 0));
  }, [products, limit, orderDirection]);

  return (
    <section className="mb-5">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">{title}</h5>
        {/* <Link href="/" legacyBehavior><a className="small text-muted">See more</a></Link> */}
      </div>

      <div className="row g-3">
        {items.length > 0
          ? items.map((p) => (
              <div key={p.id} className="col-6 col-sm-4 col-md-3">
                <Link href={`/product/${p.id}`} legacyBehavior>
                  <a className="text-decoration-none text-dark">
                    <ProductCard product={p} />
                  </a>
                </Link>
              </div>
            ))
          : Array.from({ length: Math.min(8, Math.max(1, Number(limit) || 8)) }).map((_, i) => (
              <div key={i} className="col-6 col-sm-4 col-md-3">
                <div className="card card-demo h-100 placeholder-glow">
                  <div className="card-img-top placeholder" style={{ height: 220 }} />
                  <div className="card-body">
                    <div className="placeholder col-7" />
                  </div>
                </div>
              </div>
            ))}
      </div>
    </section>
  );
}
