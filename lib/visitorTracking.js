/** Max active milliseconds accepted per ping (abuse guard). */
export const VISITOR_MAX_DELTA_MS = 120_000;

export function getRequestIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) {
    return xff.split(',')[0].trim().slice(0, 80);
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.length) {
    return realIp.trim().slice(0, 80);
  }
  const addr = req.socket?.remoteAddress;
  return typeof addr === 'string' ? addr.slice(0, 80) : '';
}

/** Country code when the host/CDN exposes it (no browser permission). */
export function getCountryFromHeaders(req) {
  const raw =
    req.headers['x-vercel-ip-country'] ||
    req.headers['cf-ipcountry'] ||
    req.headers['cloudfront-viewer-country'] ||
    '';
  const s = String(raw).trim().toUpperCase();
  if (s.length === 2) return s;
  return null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidVisitorId(id) {
  return typeof id === 'string' && UUID_RE.test(id);
}

export function clampVisitorDelta(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.floor(n), VISITOR_MAX_DELTA_MS);
}
