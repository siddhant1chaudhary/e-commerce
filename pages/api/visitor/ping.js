import { MongoClient } from 'mongodb';
import {
  clampVisitorDelta,
  getCountryFromHeaders,
  getRequestIp,
  isValidVisitorId,
} from '../../../lib/visitorTracking';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
const client = new MongoClient(uri);

function trimStr(v, max) {
  if (typeof v !== 'string') return '';
  return v.slice(0, max);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  if (!uri || !dbName) {
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  let body = {};
  try {
    body = typeof req.body === 'object' && req.body !== null ? req.body : JSON.parse(req.body || '{}');
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const visitorId = body.visitorId;
  if (!isValidVisitorId(visitorId)) {
    return res.status(400).json({ error: 'Invalid visitor id' });
  }

  const delta = clampVisitorDelta(body.activeDeltaMs);
  const navigated = Boolean(body.navigated);
  const path = trimStr(body.path, 500);
  const hints = body.hints && typeof body.hints === 'object' ? body.hints : {};
  const clientReferrer = trimStr(body.referrer, 800);
  const headerReferrer = trimStr(req.headers.referer || req.headers.referrer || '', 800);

  const ip = getRequestIp(req);
  const ipCountry = getCountryFromHeaders(req);
  const serverUa = trimStr(req.headers['user-agent'] || '', 600);
  const language = trimStr(hints.language, 40);
  const timezone = trimStr(hints.timezone, 80);
  const screen = trimStr(hints.screen, 40);
  const platform = trimStr(hints.platform, 80);
  const clientUa = trimStr(hints.userAgent, 600);
  const userAgent = clientUa || serverUa;

  const now = new Date();

  try {
    await client.connect();
    const db = client.db(dbName);
    const col = db.collection('guest_visitors');

    const $set = {
      lastSeenAt: now,
      ip,
      ipCountry: ipCountry || null,
      userAgent,
      language: language || null,
      timezone: timezone || null,
      screen: screen || null,
      platform: platform || null,
    };
    if (path) $set.lastPath = path;

    const $setOnInsert = {
      visitorId,
      firstSeenAt: now,
      referrer: clientReferrer || headerReferrer || null,
    };

    const inc = { totalActiveMs: delta };
    if (navigated) inc.pageViews = 1;

    await col.updateOne(
      { visitorId },
      { $set, $setOnInsert, $inc: inc },
      { upsert: true }
    );

    return res.status(204).end();
  } catch (err) {
    console.error('visitor ping error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    await client.close();
  }
}
