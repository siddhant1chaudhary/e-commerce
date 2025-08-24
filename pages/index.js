import Header from '../components/Header';
import BannerCarousel from '../components/BannerCarousel';
import HomeCategories from '../components/HomeCategories';
import FeaturedProducts from '../components/FeaturedProducts';
import Script from 'next/script';

export default function Home() {
  return (
    <div>
      <Script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/js/bootstrap.bundle.min.js" integrity="sha384-ndDqU0Gzau9qJ1lfW4pNLlhNTkCfHzAVBReH9diLvGRem5+R9g2FzA8ZGN954O5Q" crossOrigin="anonymous"></Script>
      <Header />
      <main className="container py-4">
        <BannerCarousel />
        <HomeCategories />
        <FeaturedProducts title="Trending styles" />
        <FeaturedProducts title="Best Sellers" />
        <section className="mb-5">
          <h5 className="mb-3">Popular Brands</h5>
          <div className="d-flex gap-3 overflow-auto py-2">
            {['Nike','Adidas','Puma','Levis','Zara','H&M'].map(b => (
              <div key={b} className="brand-pill d-flex align-items-center justify-content-center px-3 py-2 bg-white border rounded">{b}</div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
