import bcrypt from 'bcryptjs';
import { signToken, generateCsrfToken, setAuthCookies } from '../../../lib/auth';
import { findUserByEmail, updateUserById } from '../../../lib/store';

export default async function handler(req, res) {
	if (req.method !== 'POST') {
		res.setHeader('Allow', ['POST']);
		return res.status(405).end(`Method ${req.method} Not Allowed`);
	}

	const { email, password } = req.body || {};
	if (!email || !password) return res.status(400).json({ error: 'email and password required' });

	// use store to find user
	const user = await findUserByEmail(email);
	if (!user) return res.status(401).json({ error: 'Invalid credentials' });

	let ok = false;
	let updatedUser = user;

	// Support hashed passwords (bcrypt) or legacy plaintext; migrate plaintext to bcrypt on successful login
	if (typeof user.password === 'string') {
		if (user.password.startsWith('$2')) {
			ok = await bcrypt.compare(password, user.password);
		} else {
			// legacy plain text (not recommended); compare and migrate
			if (password === user.password) {
				ok = true;
				const hashed = await bcrypt.hash(password, 10);
				// persist migration via store
				updatedUser = await updateUserById(user.id, { password: hashed });
			}
		}
	}

	if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

	// create token and csrf
	const token = signToken({ sub: updatedUser.id, role: updatedUser.role || 'user' });
	const csrf = generateCsrfToken();
	setAuthCookies(res, token, csrf);

	// return public user fields (no password)
	const { password: _p, ...publicUser } = updatedUser;
	res.status(200).json(publicUser);
}
