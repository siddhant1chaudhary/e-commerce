import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import { sendOtpEmail } from '../../../lib/sendOtpEmail';

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

	const { name, email, password } = req.body || {};
	if (!email || !password) return res.status(400).json({ error: 'email and password required' });

	const normalizedEmail = String(email).trim().toLowerCase();
	const otpTtlMs = Number(process.env.SIGNUP_OTP_TTL_MS || 10 * 60 * 1000); // 10 minutes
	const otpCollectionName = process.env.SIGNUP_OTP_COLLECTION || 'signup_otps';
	const usersCollectionName = process.env.USERS_COLLECTION || 'users';

	try {
		await client.connect();
		const db = client.db('ClusterEshop-1');
		const usersCollection = db.collection(usersCollectionName);
		const otpCollection = db.collection(otpCollectionName);

		// Enforce unique email (case-insensitive)
		const emailRegex = new RegExp(`^${escapeRegExp(normalizedEmail)}$`, 'i');
		const existingUser = await usersCollection.findOne({ email: emailRegex });
		if (existingUser) return res.status(409).json({ error: 'User already exists' });

		// Generate OTP (for now we store it; wiring email/SMS delivery can be added later)
		const otp = String(Math.floor(Math.random() * 900000) + 100000); // 6 digits
		const otpHash = await bcrypt.hash(otp, 10);

		// Store pending signup (password is hashed; no change to your `users` schema required)
		const passwordHash = await bcrypt.hash(password, 10);
		const expiresAt = new Date(Date.now() + otpTtlMs);

		await otpCollection.updateOne(
			{ email: normalizedEmail },
			{
				$set: {
					email: normalizedEmail,
					name: name || '',
					passwordHash,
					otpHash,
					expiresAt,
					updatedAt: new Date()
				}
			},
			{ upsert: true }
		);

		// Send OTP email (Gmail SMTP via nodemailer)
		await sendOtpEmail({
			to: normalizedEmail,
			otp,
			name,
			expiresInSeconds: Math.floor(otpTtlMs / 1000)
		});

		// For local/dev testing we also return the OTP.
		const debugOtp = process.env.NODE_ENV === 'production' ? undefined : otp;
		const payload = { ok: true, email: normalizedEmail, otpSent: true, expiresInSeconds: Math.floor(otpTtlMs / 1000) };
		if (debugOtp) payload.debugOtp = debugOtp;
		return res.status(200).json(payload);
	} catch (err) {
		console.error('Signup API error:', err);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		await client.close();
	}
}
