import Header from '../components/Header';
import ProductList from '../components/ProductList';

export default function Beauty() {
  return (
    <>
      <Header />
      <div className="container py-4">
        <ProductList category="beauty" />
      </div>
    </>
  );
}
