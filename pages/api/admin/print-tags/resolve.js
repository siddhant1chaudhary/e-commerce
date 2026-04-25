import { findById } from '../../../../lib/store';
import { requireAdminApi } from '../../../../lib/adminApi';

export default async function handler(req, res) {
  const payload = requireAdminApi(req, res);
  if (!payload) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { ids } = req.body || {};
    const list = Array.isArray(ids) ? ids.map((x) => String(x)).filter(Boolean) : [];
    if (!list.length) return res.status(400).json({ error: 'ids[] required' });

    const products = [];
    for (const id of list.slice(0, 500)) {
      // store.findById reads by `id` field.
      const p = await findById('products', id);
      if (p) products.push(p);
    }

    return res.status(200).json({ items: products });
  } catch (err) {
    console.error('[admin/print-tags/resolve] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

