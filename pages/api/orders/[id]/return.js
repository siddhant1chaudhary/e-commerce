import { MongoClient } from 'mongodb';
import { parseCookies, verifyToken } from '../../../../lib/auth';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
const client = new MongoClient(uri);

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
	if (req.method !== 'POST') {
		res.setHeader('Allow', ['POST']);
		return res.status(405).end(`Method ${req.method} Not Allowed`);
	}

	const cookies = parseCookies(req);
	const token = cookies['token'];
	const payload = token ? verifyToken(token) : null;
	if (!payload) return res.status(401).json({ error: 'Not authenticated' });

	const { id } = req.query;
	const { reason = '' } = req.body || {};

	try {
		await client.connect();
		const db = client.db(dbName);
		const ordersCollection = db.collection('orders');

		const order = await ordersCollection.findOne({ id });
		if (!order) return res.status(404).json({ error: 'Order not found' });

		// Only the owning user can request returns.
		if (!order.userId || String(order.userId) !== String(payload.sub)) {
			return res.status(403).json({ error: 'Forbidden' });
		}

		if (order.status !== 'delivered') {
			return res.status(400).json({ error: 'Return can only be requested after delivery' });
		}

		// Prefer deliveredAt, then updatedAt, and finally createdAt as a fallback for older orders.
		const deliveredAtRaw = order.deliveredAt || order.updatedAt || order.createdAt;
		if (!deliveredAtRaw) return res.status(400).json({ error: 'Delivery date not available for this order' });

		const deliveredAtMs = new Date(deliveredAtRaw).getTime();
		if (Number.isNaN(deliveredAtMs)) {
			return res.status(400).json({ error: 'Invalid delivery date for this order' });
		}

		const eligibleUntilMs = deliveredAtMs + SEVEN_DAYS_MS;
		if (Date.now() > eligibleUntilMs) {
			return res.status(400).json({ error: 'Return request window expired' });
		}

		if (order.returnRequest && order.returnRequest.status && order.returnRequest.status !== 'rejected') {
			return res.status(400).json({ error: 'Return already requested' });
		}

		await ordersCollection.updateOne(
			{ id },
			{
				$set: {
					updatedAt: new Date().toISOString(),
					// Move order into return-flow so UI can show the new stage.
					status: 'return-requested',
					returnRequest: {
						status: 'requested',
						requestedAt: new Date().toISOString(),
						reason: String(reason || ''),
						deliveredAt: deliveredAtRaw
					}
				}
			}
		);

		const updatedOrder = await ordersCollection.findOne({ id });
		return res.status(200).json({
			...updatedOrder,
			_id: updatedOrder._id?.toString?.() || updatedOrder._id
		});
	} catch (err) {
		console.error('Return request API error:', err);
		return res.status(500).json({ error: 'Internal server error' });
	} finally {
		await client.close();
	}
}

