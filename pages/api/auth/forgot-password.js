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

	const { email } = req.body || {};
	if (!email) return res.status(400).json({ error: 'email required' });

	const normalizedEmail = String(email).trim().toLowerCase();
	const otpTtlMs = Number(process.env.FORGOT_OTP_TTL_MS || process.env.SIGNUP_OTP_TTL_MS || 10 * 60 * 1000);
	const otpCollectionName = process.env.FORGOT_OTP_COLLECTION || 'forgot_password_otps';
	const usersCollectionName = process.env.USERS_COLLECTION || 'users';

	try {
		await client.connect();
		const db = client.db('ClusterEshop-1');
		const usersCollection = db.collection(usersCollectionName);
		const otpCollection = db.collection(otpCollectionName);

		let debugOtp;

		// Find user (case-insensitive). If user doesn't exist, we still return ok
		// to prevent user enumeration.
		const emailRegex = new RegExp(`^${escapeRegExp(normalizedEmail)}$`, 'i');
		const user = await usersCollection.findOne({ email: emailRegex });

		if (user) {
			const otp = String(Math.floor(Math.random() * 900000) + 100000); // 6 digits
			const otpHash = await bcrypt.hash(otp, 10);
			const expiresAt = new Date(Date.now() + otpTtlMs);

			await otpCollection.updateOne(
				{ email: normalizedEmail },
				{
					$set: {
						email: normalizedEmail,
						userId: user.id,
						otpHash,
						expiresAt,
						updatedAt: new Date()
					}
				},
				{ upsert: true }
			);

			await sendOtpEmail({
				to: normalizedEmail,
				otp,
				name: user.name,
				expiresInSeconds: Math.floor(otpTtlMs / 1000)
			});

			// dev-friendly debug (optional)
			if (process.env.NODE_ENV !== 'production') debugOtp = otp;
		}

		const payload = {
			ok: true,
			email: normalizedEmail,
			otpSent: !!user,
			expiresInSeconds: Math.floor(otpTtlMs / 1000)
		};
		if (debugOtp) payload.debugOtp = debugOtp;

		return res.status(200).json(payload);
	} catch (err) {
		console.error('Forgot password API error:', err);
		return res.status(500).json({ error: 'Internal server error' });
	} finally {
		await client.close();
	}
}

