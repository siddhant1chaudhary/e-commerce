import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_in_production';
const TOKEN_NAME = 'token';
const CSRF_NAME = 'csrf';
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function signToken(payload) {
	// payload should contain minimal fields: { sub: userId, role }
	return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_MAX_AGE });
}

export function verifyToken(token) {
	try {
		return jwt.verify(token, JWT_SECRET);
	} catch (e) {
		return null;
	}
}

export function generateCsrfToken() {
	return crypto.randomBytes(24).toString('hex');
}

export function setAuthCookies(res, token, csrfToken) {
	const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
	const sameSite = 'Strict'; // or 'Lax' depending on needs
	// token cookie: httpOnly, not accessible to JS
	const tokenCookie = `${TOKEN_NAME}=${token}; Path=/; HttpOnly${secureFlag}; SameSite=${sameSite}; Max-Age=${TOKEN_MAX_AGE}`;
	// csrf cookie: accessible to JS (so front-end can read it and set header)
	const csrfCookie = `${CSRF_NAME}=${csrfToken}; Path=/; ${secureFlag}; SameSite=${sameSite}; Max-Age=${TOKEN_MAX_AGE}`;
	res.setHeader('Set-Cookie', [tokenCookie, csrfCookie]);
}

export function clearAuthCookies(res) {
	const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
	const sameSite = 'Strict';
	const expired = 'Expires=Thu, 01 Jan 1970 00:00:00 GMT';
	const tokenCookie = `${TOKEN_NAME}=; Path=/; HttpOnly${secureFlag}; SameSite=${sameSite}; ${expired}`;
	const csrfCookie = `${CSRF_NAME}=; Path=/; ${secureFlag}; SameSite=${sameSite}; ${expired}`;
	res.setHeader('Set-Cookie', [tokenCookie, csrfCookie]);
}

export function parseCookies(req) {
	const header = req.headers?.cookie || '';
	return header.split(';').map(c => c.trim()).filter(Boolean).reduce((acc, cur) => {
		const [k, ...v] = cur.split('=');
		acc[k] = decodeURIComponent(v.join('='));
		return acc;
	}, {});
}

// CSRF verification for API handlers: expect header 'x-csrf-token' to equal csrf cookie
export function verifyCsrf(req) {
	const cookies = parseCookies(req);
	const csrfCookie = cookies[CSRF_NAME];
	const headerToken = req.headers['x-csrf-token'] || req.headers['x-csrf-token'.toLowerCase()];
	if (!csrfCookie || !headerToken) return false;
	return csrfCookie === headerToken;
}
