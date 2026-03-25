import { parseCookies, verifyToken } from '../../../lib/auth';
import { collectionFor } from '../../../lib/store';

function genId() {
	return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function escapeRegExp(str) {
	return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default async function handler(req, res) {
	try {
		const cookies = parseCookies(req);
		const token = cookies['token'];
		const payload = token ? verifyToken(token) : null;
		if (!payload) return res.status(401).json({ error: 'Unauthorized' });

		const userId = String(payload.sub);
		const usersCol = await collectionFor('users');
		const user = await usersCol.findOne({ id: userId });
		if (!user) return res.status(404).json({ error: 'User not found' });

		if (req.method === 'GET') {
			const addresses = Array.isArray(user.addresses) ? user.addresses : [];
			const defaultAddress = addresses.find(a => a.isDefault) || addresses[0] || null;
			return res.status(200).json({
				id: user.id,
				name: user.name || '',
				email: user.email || '',
				addresses,
				defaultAddress
			});
		}

		if (req.method === 'PUT') {
			const body = req.body || {};
			const { name, email, addressName, phone, address } = body;

			const updates = {};

			if (typeof name === 'string') {
				updates.name = name;
			}

			if (typeof email === 'string' && email.trim()) {
				const normalizedEmail = email.trim().toLowerCase();
				const emailRegex = new RegExp(`^${escapeRegExp(normalizedEmail)}$`, 'i');
				const existing = await usersCol.findOne({ id: { $ne: userId }, email: emailRegex });
				if (existing) return res.status(409).json({ error: 'Email already exists' });
				updates.email = normalizedEmail;
			}

			const hasAddressFields =
				typeof addressName === 'string' || typeof phone === 'string' || typeof address === 'string';

			if (hasAddressFields) {
				const addresses = Array.isArray(user.addresses) ? user.addresses : [];
				const defaultIndex = addresses.findIndex(a => a.isDefault);
				const idx = defaultIndex !== -1 ? defaultIndex : 0;

				const canUpdateExisting = addresses[idx] && idx >= 0;
				if (canUpdateExisting) {
					const next = addresses.map((a, i) =>
						i === idx
							? {
									...a,
									name: typeof addressName === 'string' ? String(addressName) : a.name,
									phone: typeof phone === 'string' ? String(phone) : a.phone,
									address: typeof address === 'string' ? String(address) : a.address
								}
							: a
					);
					updates.addresses = next;
				} else {
					// No addresses exist yet -> create default address.
					const addr = {
						id: genId(),
						name: typeof addressName === 'string' ? String(addressName) : '',
						phone: typeof phone === 'string' ? String(phone) : '',
						address: typeof address === 'string' ? String(address) : '',
						isDefault: true
					};
					updates.addresses = [addr];
				}
			}

			if (Object.keys(updates).length === 0) {
				return res.status(400).json({ error: 'No valid fields to update' });
			}

			await usersCol.updateOne({ id: userId }, { $set: updates }, { upsert: false });
			const updated = await usersCol.findOne({ id: userId });

			const addresses = Array.isArray(updated.addresses) ? updated.addresses : [];
			const defaultAddress = addresses.find(a => a.isDefault) || addresses[0] || null;

			return res.status(200).json({
				id: updated.id,
				name: updated.name || '',
				email: updated.email || '',
				addresses,
				defaultAddress
			});
		}

		res.setHeader('Allow', ['GET', 'PUT']);
		return res.status(405).end(`Method ${req.method} Not Allowed`);
	} catch (err) {
		console.error('User profile API error:', err);
		return res.status(500).json({ error: 'Internal server error' });
	}
}

