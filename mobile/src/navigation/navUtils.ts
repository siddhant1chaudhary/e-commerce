/** Parse `/baby/newborn` → category + sub for API filters. */
export function parseShopPath(href: string): { categorySlug: string; subSlug: string } | null {
  const m = href.trim().match(/^\/([^/]+)\/([^/]+)\/?$/);
  if (!m) return null;
  return { categorySlug: m[1], subSlug: m[2] };
}
