import Header from '../components/Header';
import ProductList from '../components/ProductList';

export default function Studio() {
  return (
    <>
      <Header />
      <div className="container py-4">
        <ProductList category="studio" />
      </div>
    </>
  );
}
