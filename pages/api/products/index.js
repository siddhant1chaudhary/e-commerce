import { getProducts, upsertItem, normalizeProduct } from '../../../lib/store';
import { verifyCsrf, parseCookies, verifyToken } from '../../../lib/auth';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // read filters from query string
      const { category = '', subCategory = '', ageGroup = '' } = req.query || {};
      const products = await getProducts(); // already normalized in store
      const filtered = (products || []).filter((p) => {
        if (category && p.category && String(p.category).toLowerCase() !== String(category).toLowerCase()) return false;
        if (subCategory && p.subCategory && String(p.subCategory).toLowerCase() !== String(subCategory).toLowerCase()) return false;
        if (ageGroup && p.ageGroup && String(p.ageGroup).toLowerCase() !== String(ageGroup).toLowerCase()) return false;
        return true;
      });
      res.status(200).json(filtered);
      return;
    }

    if (req.method === 'POST') {
      // require CSRF and admin user for product creation
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

      const body = req.body || {};
      // ensure an id exists (store.upsertItem will further normalize)
      if (!body.id) body.id = Date.now().toString();

      // upsertItem will normalize and persist the canonical product schema
      const saved = await upsertItem('products', body);
      // normalize again for response safety
      const normalized = normalizeProduct(saved);
      res.status(201).json(normalized);
      return;
    }

    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error('products API error:', err);
    res.status(500).json({ error: 'Internal server error', message: err?.message || String(err) });
  }
}
