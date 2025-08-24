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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const cookies = parseCookies(req);
  const token = cookies['token'];
  const payload = token ? verifyToken(token) : null;
  if (!payload) return res.status(401).json({ error: 'Not authenticated' });

  const userId = String(payload.sub);
  const { guestCartId } = req.body || {};

  const carts = await readCarts();

  // find existing user cart (if any)
  const userIdx = carts.findIndex(c => String(c.userId) === userId);
  const userCart = userIdx !== -1 ? carts[userIdx] : null;

  // find guest cart by id (if provided)
  const guestIdx = guestCartId ? carts.findIndex(c => c.id === guestCartId) : -1;
  const guestCart = guestIdx !== -1 ? carts[guestIdx] : null;

  function setCartCookie(cartId) {
    const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `cartId=${cartId}; Path=/; SameSite=Strict${secureFlag}; Max-Age=${60*60*24*30}`);
  }

  // If user already has a cart, return it (and merge only if guestCart is a true guest)
  if (userCart) {
    // merge only when guestCart exists AND guestCart has no userId (true guest)
    if (guestCart && (!guestCart.userId || String(guestCart.userId) === String(userId))) {
      // merge guest items into userCart
      guestCart.items.forEach(gItem => {
        const idx = userCart.items.findIndex(i => i.productId === gItem.productId);
        if (idx === -1) userCart.items.push({ ...gItem });
        else userCart.items[idx].qty = (userCart.items[idx].qty || 0) + (gItem.qty || 0);
      });
      // remove the guest cart if it was a separate entry and not the same as userCart
      if (guestCart.id !== userCart.id) {
        const removeIdx = carts.findIndex(c => c.id === guestCart.id);
        if (removeIdx !== -1) carts.splice(removeIdx, 1);
      }
      carts[userIdx].updatedAt = Date.now();
      await writeCarts(carts);
    } else {
      // no merge; just refresh updatedAt
      carts[userIdx].updatedAt = Date.now();
      await writeCarts(carts);
    }

    // ensure cookie refers to user's cart id
    const finalCart = carts.find(c => String(c.userId) === userId);
    setCartCookie(finalCart.id);
    return res.status(200).json(finalCart);
  }

  // If user has no cart but guestCart exists:
  if (guestCart) {
    // If guestCart already belongs to another user (foreign), DO NOT attach it.
    if (guestCart.userId && String(guestCart.userId) !== userId) {
      // create a new empty cart for this user (do not reuse foreign cart)
      const newCart = { id: genId(), userId: userId, items: [], updatedAt: Date.now() };
      carts.unshift(newCart);
      await writeCarts(carts);
      setCartCookie(newCart.id);
      return res.status(200).json(newCart);
    }

    // guestCart is safe to attach (either truly guest or already belongs to this user)
    carts[guestIdx].userId = userId;
    carts[guestIdx].updatedAt = Date.now();
    await writeCarts(carts);
    setCartCookie(carts[guestIdx].id);
    return res.status(200).json(carts[guestIdx]);
  }

  // Neither user cart nor guest cart exists -> create new empty user cart
  const newCart = { id: genId(), userId: userId, items: [], updatedAt: Date.now() };
  carts.unshift(newCart);
  await writeCarts(carts);
  setCartCookie(newCart.id);
  return res.status(200).json(newCart);
}
