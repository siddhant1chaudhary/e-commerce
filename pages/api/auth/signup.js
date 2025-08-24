import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
	if (req.method !== 'POST') {
		res.setHeader('Allow', ['POST']);
		return res.status(405).end(`Method ${req.method} Not Allowed`);
	}

	const { name, email, password } = req.body || {};
	if (!email || !password) return res.status(400).json({ error: 'email and password required' });

	try {
		await client.connect();
		const db = client.db('ClusterEshop-1');
		const usersCollection = db.collection('users');

		// Check if the user already exists
		const existingUser = await usersCollection.findOne({ email });
		if (existingUser) return res.status(409).json({ error: 'User already exists' });

		// Hash the password and create the new user
		const hashed = await bcrypt.hash(password, 10);
		const newUser = {
			id: Date.now().toString(),
			name: name || '',
			email,
			password: hashed,
			role: 'user'
		};

		// Insert the new user into the database
		await usersCollection.insertOne(newUser);

		// Return the public user fields (exclude the password)
		const { password: _p, ...publicUser } = newUser;
		res.status(201).json(publicUser);
	} catch (err) {
		console.error('Signup API error:', err);
		res.status(500).json({ error: 'Internal server error' });
	} finally {
		await client.close();
	}
}
