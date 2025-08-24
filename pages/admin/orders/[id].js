import { MongoClient } from 'mongodb';
import Header from '../../../components/Header';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

export default function OrderDetails({ order }) {
  if (!order) {
    return (
      <div>
        <Header />
        <main className="container py-5">
          <div className="alert alert-danger">Order not found</div>
        </main>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <main className="container py-5">
        <h1 className="h4 mb-4">Order Details</h1>
        <div className="card p-4">
          <h5 className="mb-4">
            Order ID: <span className="text-primary">{order.id}</span>
          </h5>
          <p className="mb-4">
            <strong>Status:</strong>{' '}
            <span className="badge bg-info text-dark">{order.status}</span>
          </p>

          <div className="row">
            {/* Shipping Details */}
            <div className="col-md-6 mb-4">
              <h6 className="text-secondary">Shipping Details</h6>
              <div className="card p-3">
                <p><strong>Name:</strong> {order.shipping?.name}</p>
                <p><strong>Address:</strong> {order.shipping?.address}</p>
                <p><strong>Phone:</strong> {order.shipping?.phone}</p>
              </div>
            </div>

            {/* Order Summary */}
            <div className="col-md-6 mb-4">
              <h6 className="text-secondary">Order Summary</h6>
              <div className="card p-3">
                <p><strong>Subtotal:</strong> ₹{order.subtotal.toFixed(2)}</p>
                <p><strong>Discount:</strong> ₹{order.discount.toFixed(2)}</p>
                <hr />
                <p className="fw-bold"><strong>Total:</strong> ₹{order.total.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Items */}
          <h6 className="text-secondary mt-4">Items</h6>
          <div className="list-group">
            {order.items.map(item => (
              <div key={item.productId} className="list-group-item d-flex align-items-center">
                <img
                  src={item.image || '/images/placeholder.png'}
                  alt={item.title}
                  style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6 }}
                />
                <div className="ms-3 flex-grow-1">
                  <div className="fw-semibold">{item.title}</div>
                  <div className="text-muted small">₹{item.price} x {item.qty}</div>
                </div>
                <div className="fw-bold">₹{(item.price * item.qty).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export async function getServerSideProps({ params }) {
  const { id } = params;

  let order = null;
  try {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    const ordersCollection = db.collection('orders');

    order = await ordersCollection.findOne({ id });
    if (order) {
      order._id = order._id.toString(); // Convert ObjectId to string
    }

    await client.close();
  } catch (err) {
    console.error('Error fetching order details:', err);
  }

  return { props: { order } };
}
