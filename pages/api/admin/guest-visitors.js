import { MongoClient } from 'mongodb';
import { requireAdminApi } from '../../../lib/adminApi';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
const client = new MongoClient(uri);

function publicRow(doc) {
  return {
    visitorId: doc.visitorId,
    firstSeenAt: doc.firstSeenAt || null,
    lastSeenAt: doc.lastSeenAt || null,
    totalActiveMs: typeof doc.totalActiveMs === 'number' ? doc.totalActiveMs : 0,
    pageViews: typeof doc.pageViews === 'number' ? doc.pageViews : 0,
    ip: doc.ip || '',
    ipCountry: doc.ipCountry || null,
    userAgent: doc.userAgent || '',
    language: doc.language || '',
    timezone: doc.timezone || '',
    screen: doc.screen || '',
    platform: doc.platform || '',
    referrer: doc.referrer || '',
    lastPath: doc.lastPath || '',
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const admin = requireAdminApi(req, res);
  if (!admin) return;

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
    const col = db.collection('guest_visitors');

    const total = await col.countDocuments({});
    const totalPages = total === 0 ? 1 : Math.ceil(total / limit);
    const page = Math.min(requestedPage, totalPages);
    const skip = (page - 1) * limit;

    const docs = await col
      .find({})
      .sort({ lastSeenAt: -1, firstSeenAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return res.status(200).json({
      visitors: docs.map(publicRow),
      page,
      pageSize: limit,
      total,
      totalPages,
    });
  } catch (err) {
    console.error('admin guest-visitors error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    await client.close();
  }
}
