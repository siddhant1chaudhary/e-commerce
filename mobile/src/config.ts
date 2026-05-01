/**
 * Production API host (same origin as https://timtom.in/api/...).
 * Override for local Next.js: EXPO_PUBLIC_API_URL=http://192.168.x.x:3000 in mobile/.env
 */
const PRODUCTION_API_ORIGIN = 'https://timtom.in';

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || ''
).replace(/\/$/, '') || PRODUCTION_API_ORIGIN;
