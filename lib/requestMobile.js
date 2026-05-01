import { parseCookies } from './auth';

/** Guest cart id from x-cart-id header (Expo) or cartId cookie (web). */
export function getCartIdFromRequest(req) {
	const h = req.headers['x-cart-id'];
	if (h && String(h).trim()) return String(h).trim();
	const cookies = parseCookies(req);
	return cookies.cartId || null;
}
