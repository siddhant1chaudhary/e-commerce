import { MongoClient } from 'mongodb';
import { parseCookies, verifyToken } from '../../../lib/auth';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
const client = new MongoClient(uri);

function publicUserFields(u, totalOrders) {
  const name = (u.name || '').trim();
  const explicitLast = typeof u.lastName === 'string' ? u.lastName.trim() : '';
  let firstName = name;
  let lastName = explicitLast;
  if (!explicitLast && name) {
    const i = name.indexOf(' ');
    if (i !== -1) {
      firstName = name.slice(0, i);
      lastName = name.slice(i + 1).trim();
    } else {
      lastName = '';
    }
  }
  return {
    id: u.id,
    firstName: firstName || '',
    lastName: lastName || '',
    email: u.email || '',
    role: u.role || 'user',
    createdAt: u.createdAt || null,
    lastActiveAt: u.lastActiveAt || null,
    totalOrders: typeof totalOrders === 'number' ? totalOrders : 0,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const cookies = parseCookies(req);
  const token = cookies['token'];
  const payload = token ? verifyToken(token) : null;

  if (!payload || payload.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!uri || !dbName) {
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  const rawPage = parseInt(String(req.query.page || '1'), 10);
  const rawLimit = parseInt(String(req.query.limit || '25'), 10);
  const limit = Math.min(100, Math.max(1, Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 25));
  const requestedPage = Math.max(1, Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1);

  try {
    await client.connect();
    const db = client.db(dbName);
    const usersCol = db.collection('users');
    const ordersCol = db.collection('orders');

    const total = await usersCol.countDocuments({});
    const totalPages = total === 0 ? 1 : Math.ceil(total / limit);
    const page = Math.min(requestedPage, totalPages);
    const skip = (page - 1) * limit;

    const users = await usersCol
      .find({})
      .sort({ createdAt: -1, id: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const ids = users.map((u) => String(u.id)).filter(Boolean);
    let countByUserId = new Map();

    if (ids.length) {
      const orderCounts = await ordersCol
        .aggregate([
          {
            $match: {
              $expr: {
                $in: [{ $toString: '$userId' }, ids],
              },
            },
          },
          { $group: { _id: { $toString: '$userId' }, totalOrders: { $sum: 1 } } },
        ])
        .toArray();

      countByUserId = new Map(
        orderCounts.map((d) => [String(d._id), d.totalOrders])
      );
    }

    const list = users.map((u) =>
      publicUserFields(u, countByUserId.get(String(u.id)) || 0)
    );

    return res.status(200).json({
      users: list,
      page,
      pageSize: limit,
      total,
      totalPages,
    });
  } catch (err) {
    console.error('Admin users API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    await client.close();
  }
}
