import { clearAuthCookies } from '../../../lib/auth';

export default function handler(req, res) {
	// Accept POST or GET logout
	clearAuthCookies(res);
	res.status(200).json({ ok: true });
}
