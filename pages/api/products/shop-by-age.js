import { getProducts } from '../../../lib/store';
import {
  SHOP_BY_AGE_GROUPS,
  canonicalizeShopByAge,
  filterProductsByShopAge
} from '../../../lib/ageGroups';

/**
 * Shop by Age — aligns with admin "Shop by Age" on products (ageGroup).
 *
 * GET /api/products/shop-by-age
 *   → { ageGroups } metadata (values to use when creating products / ?age=)
 *
 * GET /api/products/shop-by-age?age=Newborn
 *   → { age, products }  (age is canonical: Newborn | Infants | Toddlers | Juniors)
 *
 * Optional: category, subCategory — same as /api/products
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    const { age = '', category = '', subCategory = '' } = req.query || {};
    const ageTrim = String(age).trim();
    const all = !ageTrim || ageTrim.toLowerCase() === 'all';

    if (all) {
      res.status(200).json({
        ageGroups: SHOP_BY_AGE_GROUPS,
        hint: 'Pass ?age=Newborn, Infants, Toddlers, or Juniors (labels like "New born" / "Toddler" also work).'
      });
      return;
    }

    const canonical = canonicalizeShopByAge(ageTrim);
    if (!canonical) {
      const allowed = SHOP_BY_AGE_GROUPS.map((g) => g.value).join(', ');
      res.status(400).json({
        error: 'Unknown age',
        message: `Use one of: ${allowed}, or common aliases (e.g. New born, Toddler).`,
        ageGroups: SHOP_BY_AGE_GROUPS
      });
      return;
    }

    let products = await getProducts();
    if (category) {
      products = products.filter(
        (p) => p.category && String(p.category).toLowerCase() === String(category).toLowerCase()
      );
    }
    if (subCategory) {
      products = products.filter(
        (p) =>
          p.subCategory &&
          String(p.subCategory).toLowerCase() === String(subCategory).toLowerCase()
      );
    }

    const filtered = filterProductsByShopAge(products, canonical);
    res.status(200).json({ age: canonical, products: filtered });
  } catch (err) {
    console.error('shop-by-age API error:', err);
    res.status(500).json({ error: 'Internal server error', message: err?.message || String(err) });
  }
}
