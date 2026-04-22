import { MongoClient } from 'mongodb';
import { parseCookies, verifyToken } from '../../../lib/auth';
import { sendOrderCanceledEmails, resolveOrderCustomerEmail } from '../../../lib/sendOrderEmails';

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
      // Keep original behavior: you can't cancel after shipped/delivered,
      // but allow cancel at the end of the return-delivered stage.
      if (status === 'canceled' && ['shipped', 'delivered', 'return-requested', 'return-in-progress', 'return-shipped', 'return-delivered'].includes(order.status)) {
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

      if (status === 'canceled' && updatedOrder) {
        try {
          const { customerEmail, customerName } = await resolveOrderCustomerEmail(
            db,
            updatedOrder
          );
          await sendOrderCanceledEmails({
            order: updatedOrder,
            canceledBy: updatedOrder.canceledBy || canceledBy || { role: 'user', name: 'User' },
            customerEmail,
            customerName,
            userId: updatedOrder.userId || null,
          });
        } catch (e) {
          console.error('[orders/id] cancel notification emails:', e);
        }
      }

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
