import { MongoClient } from 'mongodb';
import { verifyToken, getTokenFromRequest } from '../../../lib/auth';
import { sendOrderCanceledEmails, resolveOrderCustomerEmail } from '../../../lib/sendOrderEmails';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
const client = new MongoClient(uri);

export default async function handler(req, res) {
  const token = getTokenFromRequest(req);
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

      const updateFields = { status, updatedAt: new Date().toISOString() };

      // Persist delivery timestamp so user can request returns for a limited window.
      if (status === 'delivered') {
        // Note: we set deliveredAt every time it becomes "delivered".
        updateFields.deliveredAt = new Date().toISOString();
      }

      // Return-flow status synchronization
      const returnStatusMap = {
        'return-requested': { returnStatus: 'requested' },
        'return-in-progress': { returnStatus: 'in-progress' },
        'return-shipped': { returnStatus: 'shipped' },
        'return-delivered': { returnStatus: 'delivered' }
      };

      if (returnStatusMap[status]) {
        updateFields['returnRequest.status'] = returnStatusMap[status].returnStatus;
        if (status === 'return-delivered') {
          updateFields.returnDeliveredAt = new Date().toISOString();
          updateFields['returnRequest.returnDeliveredAt'] = new Date().toISOString();
        }
      }

      // If the status is "canceled", include the canceledBy field
      if (status === 'canceled' && canceledBy) {
        updateFields.canceledBy = canceledBy;
      }

      const result = await ordersCollection.updateOne({ id }, { $set: updateFields });
      if (result.modifiedCount === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (status === 'canceled') {
        const updatedOrder = await ordersCollection.findOne({ id });
        if (updatedOrder) {
          try {
            const { customerEmail, customerName } = await resolveOrderCustomerEmail(
              db,
              updatedOrder
            );
            await sendOrderCanceledEmails({
              order: updatedOrder,
              canceledBy:
                updatedOrder.canceledBy ||
                (canceledBy ? canceledBy : { role: 'admin', name: 'Admin' }),
              customerEmail,
              customerName,
              userId: updatedOrder.userId || null,
            });
          } catch (e) {
            console.error('[orders/admin] cancel notification emails:', e);
          }
        }
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
