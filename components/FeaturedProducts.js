import useSWR from 'swr';
import Link from 'next/link';
import ProductCard from './ProductCard';

const fetcher = (url) => fetch(url).then(r => r.json());

export default function FeaturedProducts({ title = 'Trending now' }) {
  const { data: products } = useSWR('/api/products', fetcher);

  return (
    <section className="mb-5">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">{title}</h5>
        <Link href="/" legacyBehavior><a className="small text-muted">See more</a></Link>
      </div>

      <div className="row g-3">
        {products?.slice(0,8).map(p => (
          <div key={p.id} className="col-6 col-sm-4 col-md-3">
            <Link href={`/product/${p.id}`} legacyBehavior>
              <a className="text-decoration-none text-dark">
                <ProductCard product={p} />
              </a>
            </Link>
          </div>
        )) || Array.from({length:8}).map((_,i)=>(
          <div key={i} className="col-6 col-sm-4 col-md-3">
            <div className="card card-demo h-100 placeholder-glow"><div className="card-img-top placeholder" style={{height:220}}></div><div className="card-body"><div className="placeholder col-7"></div></div></div>
          </div>
        ))}
      </div>
    </section>
  );
}
