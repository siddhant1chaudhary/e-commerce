import Header from '../components/Header';
import ProductList from '../components/ProductList';

export default function Kids() {
  return (
    <>
      <Header />
      <div className="container py-4">
        <ProductList category="kids" />
      </div>
    </>
  );
}
