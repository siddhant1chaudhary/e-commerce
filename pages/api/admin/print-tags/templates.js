import { requireAdminApi } from '../../../../lib/adminApi';
import { collectionFor } from '../../../../lib/store';

function nowIso() {
  return new Date().toISOString();
}

function normalizeTemplate(t = {}) {
  const id = t.id ? String(t.id) : `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    name: String(t.name || 'Template').trim(),
    type: t.type === 'sale' ? 'sale' : 'regular',
    size:
      t.size === '2x3' ? '2x3' : t.size === '2x1' ? '2x1' : t.size === 'custom' ? 'custom' : '2x2',
    customW: t.customW ? Number(t.customW) : 2,
    customH: t.customH ? Number(t.customH) : 2,
    showBarcode: t.showBarcode !== false,
    showQr: !!t.showQr,
    washCareText: String(t.washCareText || '').trim(),
    updatedAt: nowIso(),
    createdAt: t.createdAt || nowIso(),
  };
}

export default async function handler(req, res) {
  const payload = requireAdminApi(req, res);
  if (!payload) return;

  const col = await collectionFor('printTagTemplates');

  if (req.method === 'GET') {
    const items = await col.find({}).sort({ updatedAt: -1 }).toArray();
    return res.status(200).json({ items: items.map((x) => ({ ...x, _id: x._id?.toString?.() })) });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const t = normalizeTemplate(body);
    await col.updateOne({ id: t.id }, { $set: t }, { upsert: true });
    return res.status(201).json({ item: t });
  }

  if (req.method === 'PUT') {
    const body = req.body || {};
    if (!body.id) return res.status(400).json({ error: 'id required' });
    const existing = await col.findOne({ id: String(body.id) });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const merged = normalizeTemplate({ ...existing, ...body, id: String(body.id), createdAt: existing.createdAt });
    await col.updateOne({ id: merged.id }, { $set: merged }, { upsert: false });
    return res.status(200).json({ item: merged });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query || {};
    if (!id) return res.status(400).json({ error: 'id required' });
    await col.deleteOne({ id: String(id) });
    return res.status(204).end();
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

