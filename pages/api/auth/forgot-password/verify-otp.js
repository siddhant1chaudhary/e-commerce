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

	const { email, otp, newPassword } = req.body || {};
	if (!email || !otp || !newPassword) return res.status(400).json({ error: 'email, otp and newPassword required' });

	const normalizedEmail = String(email).trim().toLowerCase();
	const otpCollectionName = process.env.FORGOT_OTP_COLLECTION || 'forgot_password_otps';
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

		// Find the user again (case-insensitive email) to ensure email matches stored user.
		const emailRegex = new RegExp(`^${escapeRegExp(normalizedEmail)}$`, 'i');
		const user = await usersCollection.findOne({ email: emailRegex });
		if (!user) {
			await otpCollection.deleteOne({ email: normalizedEmail });
			return res.status(404).json({ error: 'User not found' });
		}

		const hashed = await bcrypt.hash(newPassword, 10);
		await usersCollection.updateOne({ id: user.id }, { $set: { password: hashed } });
		await otpCollection.deleteOne({ email: normalizedEmail });

		// Sign in after reset using same JWT/cookie mechanism as login.
		const token = signToken({ sub: user.id, role: user.role || 'user' });
		const csrf = generateCsrfToken();
		setAuthCookies(res, token, csrf);

		const { password: _p, ...publicUser } = user;
		return res.status(200).json(publicUser);
	} catch (err) {
		console.error('Verify forgot OTP API error:', err);
		return res.status(500).json({ error: 'Internal server error' });
	} finally {
		await client.close();
	}
}

