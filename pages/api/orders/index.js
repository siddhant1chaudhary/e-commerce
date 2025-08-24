import { MongoClient } from 'mongodb';
import { parseCookies, verifyToken } from '../../../lib/auth';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
const client = new MongoClient(uri);

export default async function handler(req, res) {
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

    // Fetch orders specific to the authenticated user
    const query = { userId: payload.sub };
    const orders = await ordersCollection.find(query).sort({ createdAt: -1 }).toArray();

    res.status(200).json(
      orders.map((order) => ({
        ...order,
        _id: order._id.toString(), // Convert ObjectId to string
      }))
    );
  } catch (err) {
    console.error('Orders API error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await client.close();
  }
}
