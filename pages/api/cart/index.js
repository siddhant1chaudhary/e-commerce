import { collectionFor } from '../../../lib/store';
import { parseCookies, verifyToken } from '../../../lib/auth';
import crypto from 'crypto';

async function readCarts() {
  const col = await collectionFor('carts');
  return await col.find({}).toArray();
}

async function writeCarts(carts) {
  const col = await collectionFor('carts');
  await col.deleteMany({});
  if (Array.isArray(carts) && carts.length) {
    await col.insertMany(carts);
  }
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
    const { productId, qty = 1, title, price, image, sku, size } = body;
    if (!productId) return res.status(400).json({ error: 'productId required' });
    // if client didn't send a size, try to default to product's first size (if available)
    let finalSize = size || null;
    if (!finalSize) {
      try {
        const prodCol = await collectionFor('products');
        const prod = await prodCol.findOne({ id: productId });
        const prodSizes = prod && Array.isArray(prod.sizes) ? prod.sizes : [];
        if (prodSizes.length) {
          const s = prodSizes[0];
          finalSize = typeof s === 'string' ? s : (s.label || s.value || null);
        }
      } catch (err) {
        finalSize = null;
      }
    }

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

    // upsert item (include sku and size if provided)
    // treat a product+size as a unique cart line
    const idx = cart.items.findIndex(i => i.productId === productId && (i.size || '') === (finalSize || ''));
    if (idx === -1) {
      cart.items.push({ productId, qty: Number(qty) || 1, title: title || '', price: Number(price) || 0, image: image || '', sku: sku || null, size: finalSize || null });
    } else {
      cart.items[idx].qty = (cart.items[idx].qty || 0) + (Number(qty) || 1);
      // if incoming sku or size present and existing item missing it, set them
      if (sku && !cart.items[idx].sku) cart.items[idx].sku = sku;
      if (finalSize && !cart.items[idx].size) cart.items[idx].size = finalSize;
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
