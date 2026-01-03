import { parseCookies, verifyToken } from '../../../lib/auth';
import { collectionFor } from '../../../lib/store';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default async function handler(req, res) {
  try {
    const cookies = parseCookies(req);
    const token = cookies['token'];
    const payload = token ? verifyToken(token) : null;
    if (!payload) return res.status(401).json({ error: 'Unauthorized' });
    const userId = String(payload.sub);

    const usersCol = await collectionFor('users');
    const user = await usersCol.findOne({ id: userId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (req.method === 'GET') {
      return res.status(200).json({ addresses: Array.isArray(user.addresses) ? user.addresses : [] });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const { name, phone, address } = body;
      if (!name || !phone || !address) return res.status(400).json({ error: 'name, phone and address required' });
      const addr = { id: genId(), name: String(name), phone: String(phone), address: String(address), isDefault: !Array.isArray(user.addresses) || user.addresses.length === 0 };
      const next = Array.isArray(user.addresses) ? [...user.addresses, addr] : [addr];
      await usersCol.updateOne({ id: userId }, { $set: { addresses: next } }, { upsert: false });
      return res.status(201).json({ address: addr });
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      // support actions: set-default or update
      if (body.action === 'set-default' && body.id) {
        const next = (Array.isArray(user.addresses) ? user.addresses : []).map(a => ({ ...a, isDefault: String(a.id) === String(body.id) }));
        await usersCol.updateOne({ id: userId }, { $set: { addresses: next } }, { upsert: false });
        return res.status(200).json({ ok: true });
      }
      if (body.action === 'update' && body.id) {
        const next = (Array.isArray(user.addresses) ? user.addresses : []).map(a => a.id === body.id ? { ...a, name: body.name || a.name, phone: body.phone || a.phone, address: body.address || a.address } : a);
        await usersCol.updateOne({ id: userId }, { $set: { addresses: next } }, { upsert: false });
        return res.status(200).json({ ok: true });
      }
      return res.status(400).json({ error: 'invalid action' });
    }

    if (req.method === 'DELETE') {
      const body = req.body || {};
      if (!body.id) return res.status(400).json({ error: 'id required' });
      const next = (Array.isArray(user.addresses) ? user.addresses : []).filter(a => String(a.id) !== String(body.id));
      // ensure there is a default address if any left
      if (next.length && !next.some(a => a.isDefault)) next[0].isDefault = true;
      await usersCol.updateOne({ id: userId }, { $set: { addresses: next } }, { upsert: false });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', ['GET','POST','PUT','DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error('addresses API error:', err);
    res.status(500).json({ error: 'Internal server error', message: err?.message || String(err) });
  }
}
