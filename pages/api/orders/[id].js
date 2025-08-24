import { MongoClient } from 'mongodb';
import { parseCookies, verifyToken } from '../../../lib/auth';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
const client = new MongoClient(uri);

export default async function handler(req, res) {
  const { id } = req.query;

  const cookies = parseCookies(req);
  const token = cookies['token'];
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    await client.connect();
    const db = client.db(dbName);
    const ordersCollection = db.collection('orders');

    if (req.method === 'GET') {
      const order = await ordersCollection.findOne({ id });
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      res.status(200).json({
        ...order,
        _id: order._id.toString(), // Convert ObjectId to string
      });
      return;
    }

    if (req.method === 'PUT') {
      const { status, canceledBy } = req.body || {};
      console.log('PUT Request Body:', req.body); // Log the request body for debugging

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const order = await ordersCollection.findOne({ id });
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Allow cancellation only if the order is not shipped or delivered
      if (status === 'canceled' && ['shipped', 'delivered'].includes(order.status)) {
        return res.status(400).json({ error: 'Order cannot be canceled after it is shipped or delivered' });
      }

      // Update the order status and include the canceledBy field if applicable
      const updateFields = { status };
      if (status === 'canceled' && canceledBy) {
        updateFields.canceledBy = canceledBy;
      }

      const result = await ordersCollection.updateOne({ id }, { $set: updateFields });
      if (result.modifiedCount === 0) {
        console.error('Failed to update order status:', result); // Log the update result for debugging
        return res.status(500).json({ error: 'Failed to update order status' });
      }

      const updatedOrder = await ordersCollection.findOne({ id });
      console.log('Updated Order:', updatedOrder); // Log the updated order for debugging
      res.status(200).json({
        ...updatedOrder,
        _id: updatedOrder._id.toString(), // Convert ObjectId to string
      });
      return;
    }

    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error('Order Details API error:', err); // Log the error for debugging
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await client.close();
  }
}
