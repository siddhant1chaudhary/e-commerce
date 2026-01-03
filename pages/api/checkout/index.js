import { MongoClient } from 'mongodb';
import { parseCookies, verifyToken, verifyCsrf } from '../../../lib/auth';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
const client = new MongoClient(uri);

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const cookies = parseCookies(req);
  const token = cookies['token'];
  const payload = token ? verifyToken(token) : null;
  const userId = payload?.sub || null;
  const isAuthed = !!payload;

  // CSRF required for authenticated users
  if (isAuthed && !verifyCsrf(req)) {
    return res.status(403).json({ error: 'Invalid CSRF' });
  }

  const body = req.body || {};
  const { shipping = {}, paymentMethod = 'COD', couponCode } = body;

  try {
    await client.connect();
    const db = client.db(dbName);
    const cartsCollection = db.collection('carts');
    const ordersCollection = db.collection('orders');
    const couponsCollection = db.collection('coupons');

    const cartId = cookies['cartId'] || null;
    let cart = null;
    if (userId) cart = await cartsCollection.findOne({ userId });
    if (!cart && cartId) cart = await cartsCollection.findOne({ id: cartId });
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart empty' });
    }

    const subtotal = cart.items.reduce(
      (s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0),
      0
    );

    let discount = 0;
    let couponObj = null;
    if (couponCode) {
      const c = await couponsCollection.findOne({ code: couponCode.toUpperCase() });
      if (!c) return res.status(400).json({ error: 'Invalid coupon' });
      if (c.expires && new Date(c.expires) < new Date()) {
        return res.status(400).json({ error: 'Coupon expired' });
      }
      if (c.maxUses && c.used >= c.maxUses) {
        return res.status(400).json({ error: 'Coupon usage limit reached' });
      }
      if (c.minCartValue && subtotal < c.minCartValue) {
        return res.status(400).json({ error: `Minimum cart value ₹${c.minCartValue} required` });
      }

      couponObj = c;
      discount = c.type === 'percent' ? Math.round(subtotal * (c.value / 100)) : c.value;
      discount = Math.min(discount, subtotal);

      await couponsCollection.updateOne({ code: c.code }, { $inc: { used: 1 } });
    }

    const total = Math.max(0, subtotal - discount);

    const order = {
      id: genId(),
      createdAt: new Date().toISOString(),
      userId: userId || null,
      shipping,
      paymentMethod,
      coupon: couponObj ? { code: couponObj.code, discount } : null,
      items: cart.items.map((i) => ({
        productId: i.productId,
        title: i.title,
        price: Number(i.price) || 0,
        qty: Number(i.qty) || 0,
        image: i.image || '',
        sku: i.sku || null,
        size: i.size || null
      })),
      subtotal,
      discount,
      total,
      status: 'placed',
    };

    await ordersCollection.insertOne(order);
    await cartsCollection.updateOne({ id: cart.id }, { $set: { items: [] } });

    return res.status(201).json({ ok: true, orderId: order.id, order });
  } catch (err) {
    console.error('Checkout API error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await client.close();
  }
}
