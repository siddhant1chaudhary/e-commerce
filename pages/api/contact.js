import { sendContactFormEmail } from '../../lib/sendContactEmail';

const MAX_NAME = 200;
const MAX_MESSAGE = 10000;

function isValidEmail(s) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
}

export default async function handler(req, res) {
	if (req.method !== 'POST') {
		res.setHeader('Allow', ['POST']);
		return res.status(405).end(`Method ${req.method} Not Allowed`);
	}

	const { name, email, message } = req.body || {};
	const n = String(name ?? '').trim();
	const e = String(email ?? '').trim();
	const m = String(message ?? '').trim();

	if (!n) return res.status(400).json({ error: 'Name is required' });
	if (n.length > MAX_NAME) return res.status(400).json({ error: `Name must be at most ${MAX_NAME} characters` });
	if (!e) return res.status(400).json({ error: 'Email is required' });
	if (!isValidEmail(e)) return res.status(400).json({ error: 'Invalid email address' });
	if (!m) return res.status(400).json({ error: 'Message is required' });
	if (m.length > MAX_MESSAGE) {
		return res.status(400).json({ error: `Message must be at most ${MAX_MESSAGE} characters` });
	}

	try {
		await sendContactFormEmail({ name: n, email: e, message: m });
		return res.status(200).json({ ok: true });
	} catch (err) {
		const msg = err?.message || String(err);
		console.error('[api/contact]', msg);
		if (msg.includes('not configured') || msg.includes('No contact recipient')) {
			return res.status(503).json({ error: 'Email is not available. Please try again later.' });
		}
		return res.status(500).json({ error: 'Failed to send message. Please try again later.' });
	}
}
