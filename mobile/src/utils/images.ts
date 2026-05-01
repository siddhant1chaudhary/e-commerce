import { API_BASE_URL } from '../config';

/** Resolve product / static paths from the Next app for `<Image source={{ uri }} />`. */
export function resolveImageUrl(src: string | null | undefined): string {
  if (!src) return '';
  const s = String(src).trim();
  if (!s) return '';
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('//')) return `https:${s}`;
  const path = s.startsWith('/') ? s : `/${s}`;
  return `${API_BASE_URL}${path}`;
}
