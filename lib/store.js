// load environment file based on NODE_ENV (dev/prod)
import path from 'path';
try {
  const envFile = process.env.NODE_ENV === 'production' ? '.env' : '.env';
  // dynamically require dotenv if available; ignore if missing
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(process.cwd(), envFile) });
} catch (e) {
  // dotenv not installed or failed — continue using existing process.env
}

import { MongoClient } from 'mongodb';
import navHeader from '../data/navHeader.json'; // new - use header config to seed categories

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
export async function collectionFor(name) {
  const db = await getMongoDb();
  console.log("db connected ", db)
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

  // normalize products before storing so DB always has the full schema
  let toStore;
  if (collectionName === 'products' && typeof normalizeProduct === 'function') {
    toStore = normalizeProduct(item);
    // ensure id from original item is respected (normalizeProduct may prefix with KP)
    if (item.id && String(item.id).startsWith('KP')) toStore.id = String(item.id);
  } else {
    toStore = { ...item, id: String(item.id) };
  }

  await col.updateOne({ id: String(toStore.id) }, { $set: toStore }, { upsert: true });
  return await col.findOne({ id: String(toStore.id) });
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

export const getProducts = async () => {
  const items = await getAll('products');
  // normalize each product to the canonical schema before returning to callers
  return (Array.isArray(items) ? items : []).map(normalizeProduct);
};
export const writeProducts = async (p) => writeAll('products', p);

export const getCarts = async () => getAll('carts');
export const writeCarts = async (c) => writeAll('carts', c);

export async function readCarts() {
  const col = await collectionFor('carts');
  return await col.find({}).toArray();
};
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
  {
    "_id": { "$oid": "694d6e8ac87b18b3323c4ef4" },
    "id": "KP1766682250418",
    "additionalImages": ["https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcQQTuBb4LyuG0qe75FH0ldssVC2k_FaPP-AIFcZVHnrntGAaGdxZ1sRLfr4V36ZLr6KTrS2Ez3wwmyLiRnAmBMZsppRc2kOmCasd00j9xFVD9WKUvI2MvsA7w"],
    "ageGroup": "Juniors",
    "brand": "",
    "category": "BOY",
    "createdAt": "2025-12-25T17:04:10.429Z",
    "currency": "INR",
    "description": "Blue tshirt for juniors",
    "discountPrice": 449,
    "freeSize": { "available": false, "stock": 0 },
    "isBestSeller": false,
    "mainImage": "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcQQTuBb4LyuG0qe75FH0ldssVC2k_FaPP-AIFcZVHnrntGAaGdxZ1sRLfr4V36ZLr6KTrS2Ez3wwmyLiRnAmBMZsppRc2kOmCasd00j9xFVD9WKUvI2MvsA7w",
    "price": 499,
    "productType": "general",
    "rating": { "average": 0, "count": 0 },
    "seller": { "sellerId": "S0", "sellerName": "Timtom Seller", "rating": 0, "reviewsCount": 0 },
    "shoeSizes": [],
    "sizes": [],
    "stock": 0,
    "subCategory": "T-shirts",
    "tags": [],
    "title": "Boy T-shirt blue",
    "updatedAt": "2025-12-25T17:04:10.429Z"
  },
  {
    "_id": { "$oid": "694d6f02c87b18b3323c4ef5" },
    "id": "KP1755681957545",
    "additionalImages": [],
    "ageGroup": "Uncategorized",
    "brand": "",
    "category": "GENERAL",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "currency": "INR",
    "description": "Hair Shampoo - gentle cleanse",
    "discountPrice": 179,
    "freeSize": { "available": true, "stock": 0 },
    "isBestSeller": false,
    "mainImage": "https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?q=80&w=2070&auto=format&fit=crop",
    "price": 199,
    "productType": "personal-care",
    "rating": { "average": 0, "count": 0 },
    "seller": { "sellerId": "S0", "sellerName": "Timtom Seller", "rating": 0, "reviewsCount": 0 },
    "shoeSizes": [],
    "sizes": [],
    "stock": 10,
    "subCategory": "Shampoo",
    "tags": ["hair","care"],
    "title": "Hair Shampoo",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "_id": { "$oid": "694d6f5bc87b18b3323c4ef6" },
    "id": "KP3",
    "additionalImages": [],
    "ageGroup": "Uncategorized",
    "brand": "",
    "category": "BOY",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "currency": "INR",
    "description": "Lightweight running shoes.",
    "discountPrice": 1999,
    "freeSize": { "available": false, "stock": 0 },
    "isBestSeller": false,
    "mainImage": "https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/1.webp",
    "price": 2499,
    "productType": "footwear",
    "rating": { "average": 0, "count": 0 },
    "seller": { "sellerId": "S0", "sellerName": "Timtom Seller", "rating": 0, "reviewsCount": 0 },
    "shoeSizes": [6,7,8,9,10],
    "sizes": [],
    "stock": 25,
    "subCategory": "Running Shoes",
    "tags": ["running","shoes"],
    "title": "Running Shoes",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "_id": { "$oid": "694d6fb1c87b18b3323c4ef7" },
    "id": "KP4",
    "additionalImages": [],
    "ageGroup": "Uncategorized",
    "brand": "",
    "category": "BOY",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "currency": "INR",
    "description": "Lightweight running shoes (alternate).",
    "discountPrice": 1999,
    "freeSize": { "available": false, "stock": 0 },
    "isBestSeller": false,
    "mainImage": "https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/1.webp",
    "price": 2499,
    "productType": "footwear",
    "rating": { "average": 0, "count": 0 },
    "seller": { "sellerId": "S0", "sellerName": "Timtom Seller", "rating": 0, "reviewsCount": 0 },
    "shoeSizes": [6,7,8,9,10],
    "sizes": [],
    "stock": 15,
    "subCategory": "Running Shoes",
    "tags": ["running","shoes"],
    "title": "Running Shoes (Alt)",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
];

const couponsSeed = [
  { code: 'WELCOME10', type: 'percent', value: 10, expires: '2026-01-01T00:00:00.000Z', maxUses: 10000, used: 0, minCartValue: 0 },
  { code: 'FLAT100', type: 'flat', value: 100, expires: '2026-12-31T00:00:00.000Z', maxUses: 1000, used: 0, minCartValue: 500 }
];

const cartsSeed = [];
const ordersSeed = [];

// build categories seed from navHeader.json
const now = new Date().toISOString();
const categoriesSeed = Array.isArray(navHeader) ? navHeader.map(c => ({
  id: c.id || (c.title || '').toLowerCase().replace(/\s+/g, '-'),
  title: c.title || '',
  // prefer subTitle for item slug when available, fallback to label
  subCategories: Array.isArray(c.items) ? c.items.map(it => (it.subTitle || it.label)) : [],
  createdAt: now,
  updatedAt: now
})) : [];

/* seed helper: insert seed docs when collection empty */
async function ensureSeedFor(collectionName, seedDocs = []) {
  const col = await collectionFor(collectionName);
  const count = await col.countDocuments();
  console.info(`Checking collection "${collectionName}" — current count: ${count}`);
  if (count === 0 && Array.isArray(seedDocs) && seedDocs.length) {
    // prepare documents: strip any _id/$oid and normalize products
    const docs = [];
    for (const d of seedDocs) {
      // shallow clone without _id
      const { _id, ...rest } = d;
      let doc = { ...rest };
      // ensure id string
      if (!doc.id) doc.id = String(Date.now().toString());
      // remove $oid wrapper if present (leftover from exported JSON)
      if (doc._id && typeof doc._id === 'object' && doc._id.$oid) {
        delete doc._id;
      }

      // normalize products so inserted documents match app schema
      if (collectionName === 'products' && typeof normalizeProduct === 'function') {
        try {
          // if seed provided an id, pass it through normalizeProduct then ensure id is preserved
          const normalized = normalizeProduct(doc);
          // prefer provided id (if seed uses KP... or plain); otherwise keep normalized id
          normalized.id = doc.id ? String(doc.id) : normalized.id;
          doc = normalized;
        } catch (err) {
          console.warn('normalizeProduct failed for seed doc, inserting raw doc:', err?.message || err);
        }
      }

      // final safety: ensure id is string and createdAt/updatedAt exist
      doc.id = String(doc.id || Date.now().toString());
      doc.createdAt = doc.createdAt || now;
      doc.updatedAt = doc.updatedAt || now;

      docs.push(doc);
    }

    const r = await col.insertMany(docs);
    console.info(`Seeded "${collectionName}" => inserted ${r.insertedCount} docs.`);
  } else {
    console.info(`Collection "${collectionName}" has ${count} docs - skipping seed.`);
  }
}

// allow manual trigger of seeds (useful when automatic init didn't run)
export async function runSeeder() {
  try {
    await ensureSeedFor('users', usersSeed);
    await ensureSeedFor('products', productsSeed);
    await ensureSeedFor('coupons', couponsSeed);
    await ensureSeedFor('carts', cartsSeed);
    await ensureSeedFor('orders', ordersSeed);
    await ensureSeedFor('categories', categoriesSeed); // add categories
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
}

// ensure this helper is a named export so other modules can import { normalizeProduct }
export function normalizeProduct(p = {}) {
  const now = new Date().toISOString();
  const rawId = p.id || p._id || Date.now().toString();
  const id = String(rawId).startsWith('KP') ? String(rawId) : `KP${String(rawId)}`;

  const mainImage = p.mainImage || p.image || p.main_image || '/images/placeholder.png';
  const additionalImages = Array.isArray(p.additionalImages)
    ? p.additionalImages
    : Array.isArray(p.images)
    ? p.images
    : [];

  const price = typeof p.price === 'number' ? p.price : Number(p.price || 0);
  const discountPrice = typeof p.discountPrice === 'number'
    ? p.discountPrice
    : (typeof p.discount === 'number' ? p.discount : (price ? Math.max(0, price - Math.round(price * 0.1)) : 0));

  return {
    id,
    title: p.title || p.name || 'Untitled Product',
    price,
    discountPrice,
    currency: p.currency || 'INR',
    description: p.description || p.desc || '',
    mainImage,
    additionalImages: Array.isArray(additionalImages) ? additionalImages : [],
    productType: p.productType || p.product_type || 'general',
    sizes: Array.isArray(p.sizes) ? p.sizes : [],
    shoeSizes: Array.isArray(p.shoeSizes) ? p.shoeSizes : [],
    freeSize: p.freeSize || (p.free_size ? p.free_size : { available: !!p.freeSize, stock: p.freeSize?.stock || 0 }),
    category: p.category || p.cat || 'Uncategorized',
    subCategory: p.subCategory || p.sub_category || '',
    // new: ageGroup field for Shop by Age filtering
    ageGroup: p.ageGroup || p.age_group || p.age || 'Uncategorized',
    brand: p.brand || p.vendor || '',
    seller: p.seller || {
      sellerId: p.sellerId || 'S0',
      sellerName: p.sellerName || 'Timtom Seller',
      rating: p.seller?.rating || 0,
      reviewsCount: p.seller?.reviewsCount || 0
    },
    rating: p.rating || { average: p.avgRating || 0, count: p.ratingCount || 0 },
    isBestSeller: !!p.isBestSeller,
    stock: typeof p.stock === 'number' ? p.stock : Number(p.stock || 0),
    tags: Array.isArray(p.tags) ? p.tags : (p.tags ? String(p.tags).split(',').map(t => t.trim()) : []),
    createdAt: p.createdAt || now,
    updatedAt: p.updatedAt || now,
    // SKU support for easy lookup in admin/orders
    sku: p.sku || p.skuCode || p.sku_code || null
  };
}

/* init: connect and seed (friendly logs) */
(async function initDbCheck() {
  try {
    const db = await getMongoDb();
    console.info('MongoDB connected to', db.databaseName || process.env.MONGODB_DB || '(default)');
    await runSeeder();
  } catch (err) {
    console.warn('MongoDB connection/seed failed:', err.message || err);
  }
})();

