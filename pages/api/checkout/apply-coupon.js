import fs from 'fs/promises';
import path from 'path';

const couponsPath = path.join(process.cwd(), 'data', 'coupons.json');

async function readCoupons() {
  const raw = await fs.readFile(couponsPath, 'utf-8').catch(()=> '[]');
  try { return JSON.parse(raw); } catch { return []; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { couponCode, cartTotal } = req.body || {};
  if (!couponCode) return res.status(400).json({ error: 'couponCode required' });

  const coupons = await readCoupons();
  const c = coupons.find(x => x.code.toUpperCase() === String(couponCode).toUpperCase());
  if (!c) return res.status(404).json({ error: 'Invalid coupon' });

  const now = new Date();
  if (c.expires && new Date(c.expires) < now) return res.status(400).json({ error: 'Coupon expired' });
  if (c.maxUses && typeof c.used === 'number' && c.used >= c.maxUses) return res.status(400).json({ error: 'Coupon usage limit reached' });
  if (c.minCartValue && (Number(cartTotal) || 0) < Number(c.minCartValue || 0)) {
    return res.status(400).json({ error: `Minimum cart value ₹${c.minCartValue} required` });
  }

  const total = Number(cartTotal || 0);
  let discount = 0;
  if (c.type === 'percent') discount = Math.round(total * (Number(c.value || 0) / 100));
  else discount = Number(c.value || 0);

  return res.status(200).json({ ok: true, coupon: { code: c.code, type: c.type, value: c.value }, discount: Math.min(discount, total), newTotal: Math.max(0, total - discount) });
}
