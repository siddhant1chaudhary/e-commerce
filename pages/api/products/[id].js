import { MongoClient } from 'mongodb';
import { verifyCsrf, parseCookies, verifyToken } from '../../../lib/auth';
import { normalizeProduct } from '../../../lib/store';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
const client = new MongoClient(uri);

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('products');

    const product = await collection.findOne({ id });
    if (!product) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    if (req.method === 'GET') {
      // return normalized product so clients always get the full schema (includes `sizes`)
      res.status(200).json(normalizeProduct(product));
      return;
    }

    if (req.method === 'PUT' || req.method === 'DELETE') {
      if (!verifyCsrf(req)) {
        res.status(403).json({ error: 'Invalid CSRF' });
        return;
      }

      const cookies = parseCookies(req);
      const token = cookies['token'];
      const payload = token ? verifyToken(token) : null;
      if (!payload || payload.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    if (req.method === 'PUT') {
      const updatedRaw = { ...product, ...req.body };
      // normalize before returning to ensure sizes and other fields exist
      const updated = normalizeProduct(updatedRaw);
      await collection.updateOne({ id }, { $set: updatedRaw });
      res.status(200).json(updated);
      return;
    }

    if (req.method === 'DELETE') {
      await collection.deleteOne({ id });
      res.status(204).end();
      return;
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error('Product API error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await client.close();
  }
}

