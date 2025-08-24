import { MongoClient } from 'mongodb';
import { parseCookies, verifyToken } from '../../../lib/auth';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
const client = new MongoClient(uri);

export default async function handler(req, res) {
  const cookies = parseCookies(req);
  const token = cookies['token'];
  const payload = token ? verifyToken(token) : null;

  if (!payload || payload.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    await client.connect();
    const db = client.db(dbName);
    const ordersCollection = db.collection('orders');

    if (req.method === 'GET') {
      // Fetch all orders, including shipping (address) details
      const orders = await ordersCollection.find({}).sort({ createdAt: -1 }).toArray();
      return res.status(200).json(
        orders.map(order => ({
          ...order,
          _id: order._id.toString(), // Convert ObjectId to string
          shipping: order.shipping || {}, // Ensure shipping details are included
        }))
      );
    }

    if (req.method === 'PUT') {
      // Update order status
      const { id, status, canceledBy } = req.body || {};
      if (!id || !status) {
        return res.status(400).json({ error: 'Order ID and status are required' });
      }

      const updateFields = { status };

      // If the status is "canceled", include the canceledBy field
      if (status === 'canceled' && canceledBy) {
        updateFields.canceledBy = canceledBy;
      }

      const result = await ordersCollection.updateOne({ id }, { $set: updateFields });
      if (result.modifiedCount === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error('Admin Orders API error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await client.close();
  }
}
