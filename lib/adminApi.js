import { parseCookies, verifyToken } from './auth';

export function requireAdminApi(req, res) {
  const cookies = parseCookies(req);
  const token = cookies['token'];
  const payload = token ? verifyToken(token) : null;

  if (!payload || payload.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }

  return payload;
}

