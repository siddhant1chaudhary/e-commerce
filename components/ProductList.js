import React from 'react';
import useSWR from 'swr';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function ProductList({ category }) {
  const { data: products } = useSWR(`/api/products?category=${category}`, fetcher);

  const handleAddToCart = (productId) => {
    console.log(`Product ${productId} added to cart`);
  };

  return (
    <div className="row g-3">
      {products?.map((product) => (
        <div key={product.id} className="col-6 col-md-3">
          <div className="card h-100">
            <img
              src={product.image || '/images/placeholder.png'}
              alt={product.title}
              style={{ height: 140, objectFit: 'cover' }}
            />
            <div className="p-2">
              <div className="small fw-semibold">{product.title}</div>
              <div className="text-muted small">₹{product.price}</div>
              <button
                className="btn btn-sm btn-primary mt-2"
                onClick={() => handleAddToCart(product.id)}
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )) || (
        <div className="col-12">
          <div className="text-muted">Loading products...</div>
        </div>
      )}
    </div>
  );
}
