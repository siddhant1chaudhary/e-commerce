/**
 * Canonical "Shop by Age" values saved on products (admin product form).
 * Use this module for API filtering and query aliases.
 */
export const SHOP_BY_AGE_GROUPS = [
  { value: 'Newborn', label: 'New born', description: '0-6 Months' },
  { value: 'Infants', label: 'Infants', description: '6-24 Months' },
  { value: 'Toddlers', label: 'Toddler', description: '2-7 Years' },
  { value: 'Juniors', label: 'Juniors', description: '7-10 Years' }
];

const ALIAS_TO_CANONICAL = (() => {
  const m = new Map();
  for (const { value, label } of SHOP_BY_AGE_GROUPS) {
    const add = (s) => {
      const k = normKey(s);
      if (k) m.set(k, value);
    };
    add(value);
    add(label);
  }
  // common URL / user spellings
  [
    ['newborn', 'Newborn'],
    ['new born', 'Newborn'],
    ['new-born', 'Newborn'],
    ['newborns', 'Newborn'],
    ['infant', 'Infants'],
    ['toddler', 'Toddlers'],
    ['junior', 'Juniors']
  ].forEach(([alias, canonical]) => m.set(normKey(alias), canonical));
  return m;
})();

function normKey(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ');
}

/** Resolve query string to canonical age value, or null for "all" / empty. */
export function canonicalizeShopByAge(input) {
  if (input == null || input === '') return null;
  const raw = normKey(input);
  if (!raw || raw === 'all' || raw === 'any') return null;
  return ALIAS_TO_CANONICAL.get(raw) || null;
}

/** Canonical age stored on product for comparison, or null if not a known shop-by-age. */
export function canonicalAgeFromProduct(product) {
  if (!product || !product.ageGroup) return null;
  return canonicalizeShopByAge(product.ageGroup) || null;
}

export function filterProductsByShopAge(products, ageQuery) {
  const target = canonicalizeShopByAge(ageQuery);
  if (!target) return Array.isArray(products) ? [...products] : [];
  return (products || []).filter((p) => canonicalAgeFromProduct(p) === target);
}
