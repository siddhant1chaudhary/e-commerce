import Header from '../../components/Header';
import { MongoClient } from 'mongodb';
import { useState } from 'react';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

export default function OrderPage({ order, user }) {
  const [currentOrder, setCurrentOrder] = useState(order);
  const [isCanceling, setIsCanceling] = useState(false);

  const handleCancelOrder = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    setIsCanceling(true);
    try {
      const body = {
        status: 'canceled',
        canceledBy: { role: 'user', name:'User' },
      };

      if (!currentOrder.id) {
        alert('Order ID is missing. Cannot cancel the order.');
        return;
      }

      const res = await fetch(`/api/orders/${currentOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to cancel order');
        return;
      }

      const updatedOrder = await res.json();
      setCurrentOrder(updatedOrder);
      alert('Order canceled successfully');
    } catch (err) {
      alert('An error occurred while canceling the order');
    } finally {
      setIsCanceling(false);
    }
  };

  if (!currentOrder) {
    return (
      <div>
        <Header />
        <main className="container py-5"><div className="alert alert-danger">Order not found</div></main>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <main className="container py-5">
        <div className="card p-4">
          <h3 className="mb-2">Order Details</h3>
          <div className="text-muted small mb-3">Order id: <strong>{currentOrder.id}</strong></div>

          <div className="row">
            <div className="col-md-6">
              <h6>Shipping</h6>
              <div>{currentOrder.shipping?.name}</div>
              <div className="small text-muted">{currentOrder.shipping?.phone}</div>
              <div className="small text-muted">{currentOrder.shipping?.address}</div>
            </div>
            <div className="col-md-6">
              <h6>Summary</h6>
              <div className="d-flex justify-content-between"><div>Subtotal</div><div>₹{currentOrder.subtotal.toFixed(2)}</div></div>
              <div className="d-flex justify-content-between"><div>Discount</div><div>-₹{currentOrder.discount.toFixed(2)}</div></div>
              <hr />
              <div className="d-flex justify-content-between fw-bold"><div>Total</div><div>₹{currentOrder.total.toFixed(2)}</div></div>
            </div>
          </div>

          <h6 className="mt-4">Items</h6>
          <div className="list-group">
            {currentOrder.items.map(it => (
              <div key={it.productId} className="list-group-item d-flex align-items-center">
                <img src={it.image || '/images/placeholder.png'} alt={it.title} style={{width:80,height:80,objectFit:'cover',borderRadius:6}} />
                <div className="ms-3 flex-grow-1">
                  <div className="fw-semibold">{it.title}</div>
                  <div className="small text-muted">Qty {it.qty} • ₹{it.price}</div>
                </div>
                <div>₹{(it.price * it.qty).toFixed(2)}</div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <a href="/" className="btn btn-primary">Continue shopping</a>
            <button
              className="btn btn-danger ms-2"
              onClick={handleCancelOrder}
              disabled={currentOrder.status === 'canceled' || currentOrder.status === 'shipped' || isCanceling}
            >
              {currentOrder.status === 'canceled' ? 'Order Canceled' : 'Cancel Order'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export async function getServerSideProps({ params, req }) {
  const id = params.id;

  let order = null;
  let user = null;
  try {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    const ordersCollection = db.collection('orders');

    // Fetch the order by id
    order = await ordersCollection.findOne({ id });

    if (order) {
      // Convert the MongoDB ObjectId to a string
      order._id = order._id.toString();
    }

    // Fetch user details from token
    const token = req.cookies['token'];

    if (token) {
      try {
        const payload = verifyToken(token);
        user = { id: payload.sub, name: payload.name || 'User' };
      } catch (err) {
        console.error('Token verification failed:', err);
      }
    }

    await client.close();
  } catch (err) {
    console.error('Error fetching order or user:', err);
  }

  return { props: { order, user } };
}