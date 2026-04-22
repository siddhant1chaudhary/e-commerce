import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import { generateCsrfToken, setAuthCookies, signToken } from '../../../../lib/auth';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

function escapeRegExp(str) {
	return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default async function handler(req, res) {
	if (req.method !== 'POST') {
		res.setHeader('Allow', ['POST']);
		return res.status(405).end(`Method ${req.method} Not Allowed`);
	}

	const { email, otp } = req.body || {};
	if (!email || !otp) return res.status(400).json({ error: 'email and otp required' });

	const normalizedEmail = String(email).trim().toLowerCase();
	const otpCollectionName = process.env.SIGNUP_OTP_COLLECTION || 'signup_otps';
	const usersCollectionName = process.env.USERS_COLLECTION || 'users';

	try {
		await client.connect();
		const db = client.db('ClusterEshop-1');
		const usersCollection = db.collection(usersCollectionName);
		const otpCollection = db.collection(otpCollectionName);

		const pending = await otpCollection.findOne({ email: normalizedEmail });
		if (!pending) return res.status(400).json({ error: 'OTP not found or expired' });

		if (!pending.expiresAt || new Date(pending.expiresAt).getTime() < Date.now()) {
			await otpCollection.deleteOne({ email: normalizedEmail });
			return res.status(400).json({ error: 'OTP expired' });
		}

		const ok = await bcrypt.compare(String(otp), String(pending.otpHash));
		if (!ok) return res.status(401).json({ error: 'Invalid OTP' });

		// Re-check unique email right before creating the user.
		const emailRegex = new RegExp(`^${escapeRegExp(normalizedEmail)}$`, 'i');
		const existingUser = await usersCollection.findOne({ email: emailRegex });
		if (existingUser) {
			// Clean up pending record so it can't be retried endlessly.
			await otpCollection.deleteOne({ email: normalizedEmail });
			return res.status(409).json({ error: 'User already exists' });
		}

		const now = new Date().toISOString();
		const userDoc = {
			id: Date.now().toString(),
			name: pending.name || '',
			email: normalizedEmail,
			password: pending.passwordHash,
			role: 'user',
			createdAt: now,
			lastActiveAt: now
		};

		await usersCollection.insertOne(userDoc);
		await otpCollection.deleteOne({ email: normalizedEmail });

		// Sign them in (same cookies your /api/auth/login uses)
		const token = signToken({ sub: userDoc.id, role: userDoc.role || 'user' });
		const csrf = generateCsrfToken();
		setAuthCookies(res, token, csrf);

		const { password: _p, ...publicUser } = userDoc;
		return res.status(200).json(publicUser);
	} catch (err) {
		console.error('Verify OTP API error:', err);
		return res.status(500).json({ error: 'Internal server error' });
	} finally {
		await client.close();
	}
}

