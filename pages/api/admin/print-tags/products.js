import { getProducts } from '../../../../lib/store';
import { requireAdminApi } from '../../../../lib/adminApi';

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

export default async function handler(req, res) {
  const payload = requireAdminApi(req, res);
  if (!payload) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const {
      q = '',
      category = '',
      subCategory = '',
      sku = '',
      title = '',
      limit = '50',
    } = req.query || {};

    const lim = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10) || 50));

    const products = await getProducts();
    const qn = norm(q);
    const cn = norm(category);
    const scn = norm(subCategory);
    const skun = norm(sku);
    const tn = norm(title);

    const out = (products || [])
      .filter((p) => {
        if (cn && norm(p.category) !== cn) return false;
        if (scn && norm(p.subCategory) !== scn) return false;
        if (skun && !norm(p.sku).includes(skun)) return false;
        if (tn && !norm(p.title).includes(tn)) return false;
        if (qn) {
          const hay = `${p.title || ''} ${p.sku || ''} ${p.id || ''} ${p.brand || ''} ${p.category || ''} ${p.subCategory || ''}`;
          if (!norm(hay).includes(qn)) return false;
        }
        return true;
      })
      .slice(0, lim)
      .map((p) => ({
        id: p.id,
        title: p.title,
        sku: p.sku || null,
        category: p.category || '',
        subCategory: p.subCategory || '',
        brand: p.brand || '',
        price: typeof p.price === 'number' ? p.price : Number(p.price || 0),
        discountPrice:
          typeof p.discountPrice === 'number' ? p.discountPrice : Number(p.discountPrice || 0),
        sizes: Array.isArray(p.sizes) ? p.sizes : [],
        shoeSizes: Array.isArray(p.shoeSizes) ? p.shoeSizes : [],
        freeSize: p.freeSize || null,
        mainImage: p.mainImage || p.image || null,
        // Optional fields (if present in DB)
        colors: Array.isArray(p.colors) ? p.colors : [],
        fabric: p.fabric || null,
        washCare: p.washCare || null,
        mrp: typeof p.mrp === 'number' ? p.mrp : (p.mrp ? Number(p.mrp) : null),
      }));

    return res.status(200).json({ items: out });
  } catch (err) {
    console.error('[admin/print-tags/products] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

