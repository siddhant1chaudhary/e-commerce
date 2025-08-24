// load environment file based on NODE_ENV (dev/prod)
import path from 'path';
try {
  const envFile = process.env.NODE_ENV === 'production' ? '.env.prod' : '.env.dev';
  // dynamically require dotenv if available; ignore if missing
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(process.cwd(), envFile) });
} catch (e) {
  // dotenv not installed or failed — continue using existing process.env
}

import { MongoClient } from 'mongodb';

const DRIVER = 'mongo';
if (!process.env.MONGODB_URI) {
  console.warn('MONGODB_URI not set — store is configured for Mongo but no URI provided. Set MONGODB_URI in env.');
}

let _mongoClient = null;
let _mongoDb = null;

async function getMongoDb() {
  if (_mongoDb) return _mongoDb;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  _mongoClient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await _mongoClient.connect();
  _mongoDb = _mongoClient.db(process.env.MONGODB_DB || undefined);
  return _mongoDb;
}
async function collectionFor(name) {
  const db = await getMongoDb();
  return db.collection(name);
}

/* Generic Mongo operations */
export async function getAll(collectionName) {
  const col = await collectionFor(collectionName);
  return await col.find({}).toArray();
}

export async function writeAll(collectionName, items) {
  const col = await collectionFor(collectionName);
  await col.deleteMany({});
  if (Array.isArray(items) && items.length) await col.insertMany(items);
  return await col.find({}).toArray();
}

export async function findById(collectionName, id) {
  if (!id) return null;
  const col = await collectionFor(collectionName);
  return await col.findOne({ id: String(id) });
}

export async function findOneByField(collectionName, field, value) {
  if (!field) return null;
  const col = await collectionFor(collectionName);
  return await col.findOne({ [field]: value });
}

export async function upsertItem(collectionName, item) {
  if (!item) throw new Error('item required');
  if (!item.id) item.id = Date.now().toString();
  const col = await collectionFor(collectionName);
  await col.updateOne({ id: String(item.id) }, { $set: item }, { upsert: true });
  return await col.findOne({ id: String(item.id) });
}

export async function deleteById(collectionName, id) {
  if (!id) return false;
  const col = await collectionFor(collectionName);
  const r = await col.deleteOne({ id: String(id) });
  return r.deletedCount > 0;
}

/* Convenience domain helpers */
export const getUsers = async () => getAll('users');
export const writeUsers = async (u) => writeAll('users', u);
export const findUserByEmail = async (email) => {
  if (!email) return null;
  const col = await collectionFor('users');
  return await col.findOne({ email: String(email).toLowerCase() });
};
export const findUserById = async (id) => findById('users', id);
export const updateUserById = async (id, updates = {}) => {
  if (!id) throw new Error('id required');
  const col = await collectionFor('users');
  await col.updateOne({ id: String(id) }, { $set: updates }, { upsert: false });
  return await col.findOne({ id: String(id) });
};

export const getProducts = async () => getAll('products');
export const writeProducts = async (p) => writeAll('products', p);

export const getCarts = async () => getAll('carts');
export const writeCarts = async (c) => writeAll('carts', c);

export const getCoupons = async () => getAll('coupons');
export const writeCoupons = async (c) => writeAll('coupons', c);

export const getOrders = async () => getAll('orders');
export const writeOrders = async (o) => writeAll('orders', o);

/* helper: test connection and return status object */
export async function testConnection() {
  try {
    const db = await getMongoDb();
    const serverStatus = await db.admin().serverStatus();
    return { ok: true, dbName: db.databaseName || process.env.MONGODB_DB || null, info: { host: serverStatus.host || null } };
  } catch (err) {
    return { ok: false, driver: DRIVER, error: String(err.message || err) };
  }
}

/* Embedded seeds (insert when collections are empty) */
const usersSeed = [
  {
    id: '100',
    name: 'Admin',
    email: 'admin@demo.com',
    password: '$2a$10$FzHltCLE5JSH1THIg2tXbeKHkYZ8NhtJiLH0pKuhfWjboY96hYaU2', // 'admin123'
    role: 'admin'
  },
  {
    id: '1755673416740',
    name: 'siddhant',
    email: 'siddhant@gmail.com',
    password: '$2a$10$9V5afqt1TBdMrB7s5IQT6.X0jOpuMjj.6QufCI44HWdhd7glxjiwa', // demo hashed
    role: 'user'
  }
];

const productsSeed = [
  { id: '1755698386214', title: 'new product', price: 1999, description: 'iytfcgvh', image: '/images/placeholder.png' },
  { id: '1755681957545', title: 'Hair Shampoo', price: 199, description: 'Hair Shampoo', image: 'https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?q=80&w=2070&auto=format&fit=crop' },
  { id: '3', title: 'Running Shoes', price: 2499, description: 'Lightweight running shoes.', image: 'https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/1.webp' },
  { id: '4', title: 'Running Shoes', price: 2499, description: 'Lightweight running shoes.', image: 'https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/1.webp' }
];

const couponsSeed = [
  { code: 'WELCOME10', type: 'percent', value: 10, expires: '2026-01-01T00:00:00.000Z', maxUses: 10000, used: 0, minCartValue: 0 },
  { code: 'FLAT100', type: 'flat', value: 100, expires: '2026-12-31T00:00:00.000Z', maxUses: 1000, used: 0, minCartValue: 500 }
];

const cartsSeed = [];
const ordersSeed = [];

/* seed helper: insert seed docs when collection empty */
async function ensureSeedFor(collectionName, seedDocs = []) {
  const col = await collectionFor(collectionName);
  const count = await col.countDocuments();
  if (count === 0 && Array.isArray(seedDocs) && seedDocs.length) {
    const docs = seedDocs.map(d => ({ ...d, id: String(d.id || Date.now().toString()) }));
    await col.insertMany(docs);
    console.info(`Seeded "${collectionName}" (${docs.length} docs).`);
  } else {
    console.info(`Collection "${collectionName}" has ${count} docs - skipping seed.`);
  }
}

export async function seedAll() {
  try {
    await ensureSeedFor('users', usersSeed);
    await ensureSeedFor('products', productsSeed);
    await ensureSeedFor('coupons', couponsSeed);
    await ensureSeedFor('carts', cartsSeed);
    await ensureSeedFor('orders', ordersSeed);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
}

/* init: connect and seed (friendly logs) */
(async function initDbCheck() {
  try {
    const db = await getMongoDb();
    console.info('MongoDB connected to', db.databaseName || process.env.MONGODB_DB || '(default)');
    await seedAll();
  } catch (err) {
    console.warn('MongoDB connection/seed failed:', err.message || err);
  }
})();
  
