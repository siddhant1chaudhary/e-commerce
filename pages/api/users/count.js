import { MongoClient } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await MongoClient.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const db = client.db("ClusterEshop-1");

    const totalUsers = await db.collection('users').countDocuments({});
    client.close();

    return res.status(200).json({ totalUsers });
  } catch (error) {
    console.error('Error fetching user count:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
