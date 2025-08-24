import fs from 'fs/promises';
import path from 'path';
import { parseCookies, verifyToken } from '../../../lib/auth';
import crypto from 'crypto';

const dataPath = path.join(process.cwd(), 'data', 'carts.json');

async function readCarts() {
  const raw = await fs.readFile(dataPath, 'utf-8').catch(() => '[]');
  try { return JSON.parse(raw); } catch (e) { return []; }
}
async function writeCarts(carts) {
  await fs.writeFile(dataPath, JSON.stringify(carts, null, 2));
}

function genId() {
  return crypto.randomBytes(12).toString('hex');
}

function setCartCookie(res, cartId) {
  const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `cartId=${cartId}; Path=/; SameSite=Strict${secureFlag}; Max-Age=${60*60*24*30}`);
}

export default async function handler(req, res) {
  const cookies = parseCookies(req);
  const token = cookies['token'];
  const payload = token ? verifyToken(token) : null;
  const userId = payload ? String(payload.sub) : null;
  const cartIdCookie = cookies['cartId'] || null;

  let carts = await readCarts();

  // Resolve cart: prefer user cart (if logged in), then guest cart by cartId (only if that cart is a guest or belongs to user), else null
  function resolveCart() {
    if (userId) {
      const uc = carts.find(c => String(c.userId) === userId);
      if (uc) return uc;
    }
    if (cartIdCookie) {
      const candidate = carts.find(c => c.id === cartIdCookie);
      if (candidate) {
        // accept candidate only if it is a guest cart (no userId) or already belongs to the same user
        if (!candidate.userId || String(candidate.userId) === userId) return candidate;
      }
    }
    return null;
  }

  // GET: return resolved cart or create one
  if (req.method === 'GET') {
    let cart = resolveCart();
    if (!cart) {
      // create new cart: attach to user if logged in, otherwise guest cart
      cart = { id: genId(), userId: userId || null, items: [], updatedAt: Date.now() };
      carts.unshift(cart);
      await writeCarts(carts);
    }
    // ensure cookie set to cart id
    setCartCookie(res, cart.id);
    return res.status(200).json(cart);
  }

  // POST: add item to resolved cart (create if needed)
  if (req.method === 'POST') {
    const body = req.body || {};
    const { productId, qty = 1, title, price, image } = body;
    if (!productId) return res.status(400).json({ error: 'productId required' });

    let cart = resolveCart();
    if (!cart) {
      // create one (attach to user if logged in)
      cart = { id: genId(), userId: userId || null, items: [], updatedAt: Date.now() };
      carts.unshift(cart);
    }

    // If the request is authenticated ensure the cart is associated with the user
    if (userId && !cart.userId) {
      cart.userId = userId;
    }

    // upsert item
    const idx = cart.items.findIndex(i => i.productId === productId);
    if (idx === -1) {
      cart.items.push({ productId, qty: Number(qty) || 1, title: title || '', price: Number(price) || 0, image: image || '' });
    } else {
      cart.items[idx].qty = (cart.items[idx].qty || 0) + (Number(qty) || 1);
    }
    cart.updatedAt = Date.now();

    // persist
    const existingIdx = carts.findIndex(c => c.id === cart.id);
    if (existingIdx !== -1) carts[existingIdx] = cart;
    else carts.unshift(cart);
    await writeCarts(carts);

    // set cartId cookie so other tabs/sessions can reuse the same cart
    setCartCookie(res, cart.id);

    return res.status(200).json(cart);
  }

  // PUT: replace cart items
  if (req.method === 'PUT') {
    const body = req.body || {};
    const items = Array.isArray(body.items) ? body.items : [];
    let cart = resolveCart();
    if (!cart) {
      cart = { id: genId(), userId: userId || null, items: [], updatedAt: Date.now() };
      carts.unshift(cart);
    }
    if (userId && !cart.userId) cart.userId = userId;
    cart.items = items;
    cart.updatedAt = Date.now();

    const existingIdx = carts.findIndex(c => c.id === cart.id);
    if (existingIdx !== -1) carts[existingIdx] = cart;
    else carts.unshift(cart);
    await writeCarts(carts);

    setCartCookie(res, cart.id);
    return res.status(200).json(cart);
  }

  res.setHeader('Allow', ['GET','POST','PUT']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
