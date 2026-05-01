import { apiJson, rememberCartFromResponse, setAuthToken } from './client';

export type Product = {
  id: string;
  title?: string;
  price?: number;
  discountPrice?: number;
  mrp?: number;
  category?: string;
  subCategory?: string;
  ageGroup?: string;
  mainImage?: string;
  image?: string;
  images?: string[];
  additionalImages?: string[];
  sizes?: (string | { label?: string; value?: string })[];
  sku?: string;
  skuCode?: string;
  brand?: string;
  currency?: string;
  description?: string;
  tags?: string[];
  seller?: { sellerName?: string; rating?: number } | string;
  rating?: number | { average?: number; count?: number };
  ratingCount?: number;
  createdAt?: string;
  freeSize?: { available?: boolean };
};

export type Cart = {
  id: string;
  userId?: string | null;
  items: CartLine[];
  updatedAt?: number;
};

export type CartLine = {
  productId: string;
  title?: string;
  price?: number;
  qty?: number;
  image?: string;
  sku?: string | null;
  size?: string | null;
};

export async function fetchProducts(query?: Record<string, string>): Promise<Product[]> {
  const q = query
    ? new URLSearchParams(
        Object.fromEntries(Object.entries(query).filter(([, v]) => v != null && v !== ''))
      ).toString()
    : '';
  const path = q ? `/api/products?${q}` : '/api/products';
  return apiJson<Product[]>(path);
}

export async function fetchProduct(id: string): Promise<Product> {
  return apiJson<Product>(`/api/products/${encodeURIComponent(id)}`);
}

export async function fetchCart(): Promise<Cart> {
  const cart = await apiJson<Cart>('/api/cart', { method: 'GET' });
  await rememberCartFromResponse(cart);
  return cart;
}

export async function postCartLine(body: {
  productId: string;
  qty?: number;
  title?: string;
  price?: number;
  image?: string;
  sku?: string | null;
  size?: string | null;
}): Promise<Cart> {
  const cart = await apiJson<Cart>('/api/cart', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await rememberCartFromResponse(cart);
  return cart;
}

export async function putCartItems(items: CartLine[]): Promise<Cart> {
  const cart = await apiJson<Cart>('/api/cart', {
    method: 'PUT',
    body: JSON.stringify({ items }),
  });
  await rememberCartFromResponse(cart);
  return cart;
}

export async function mergeGuestCart(guestCartId: string | null): Promise<Cart> {
  const cart = await apiJson<Cart>('/api/cart/merge', {
    method: 'POST',
    body: JSON.stringify({ guestCartId }),
  });
  await rememberCartFromResponse(cart);
  return cart;
}

export type UserPublic = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
};

export type LoginResponse = UserPublic & { token?: string; csrf?: string };

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  return apiJson<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, returnTokens: true }),
  });
}

export async function signupRequest(body: { name: string; email: string; password: string }) {
  return apiJson('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) });
}

export async function signupVerifyOtp(email: string, otp: string): Promise<LoginResponse> {
  return apiJson<LoginResponse>('/api/auth/signup/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp, returnTokens: true }),
  });
}

export async function forgotPasswordRequest(email: string) {
  return apiJson('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function forgotPasswordVerify(
  email: string,
  otp: string,
  newPassword: string
): Promise<LoginResponse> {
  return apiJson<LoginResponse>('/api/auth/forgot-password/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp, newPassword, returnTokens: true }),
  });
}

export async function logoutRequest(): Promise<void> {
  try {
    await apiJson('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) });
  } catch {
    /* ignore */
  }
  await setAuthToken(null);
}

export async function fetchProfile() {
  return apiJson<{
    id: string;
    name?: string;
    email?: string;
    addresses?: unknown[];
    defaultAddress?: unknown;
  }>('/api/users/profile');
}

export async function putProfile(body: { name?: string; email?: string }) {
  return apiJson('/api/users/profile', { method: 'PUT', body: JSON.stringify(body) });
}

export async function fetchAddresses() {
  return apiJson<{ addresses: Address[] }>('/api/users/addresses');
}

export type Address = {
  id: string;
  name?: string;
  phone?: string;
  address?: string;
  isDefault?: boolean;
};

export async function postAddress(body: { name: string; phone: string; address: string }) {
  return apiJson<{ address: Address }>('/api/users/addresses', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function applyCoupon(couponCode: string, cartTotal: number) {
  return apiJson<{
    ok?: boolean;
    coupon?: { code: string; type?: string; value?: number };
    discount?: number;
    newTotal?: number;
  }>('/api/checkout/apply-coupon', {
    method: 'POST',
    body: JSON.stringify({ couponCode, cartTotal }),
  });
}

export async function checkoutOrder(body: {
  shipping: Record<string, string>;
  paymentMethod: string;
  couponCode?: string | null;
}) {
  return apiJson<{ ok?: boolean; orderId: string; order?: unknown }>('/api/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function fetchOrders() {
  return apiJson<
    (Record<string, unknown> & {
      id?: string;
      status?: string;
      createdAt?: string;
      total?: number;
    })[]
  >('/api/orders');
}

export async function fetchOrder(id: string) {
  return apiJson(`/api/orders/${encodeURIComponent(id)}`);
}

export async function putOrderStatus(id: string, body: unknown) {
  return apiJson(`/api/orders/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function postOrderReturn(id: string, reason: string) {
  return apiJson(`/api/orders/${encodeURIComponent(id)}/return`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function fetchShopByAge(age: string) {
  return apiJson<{ age: string; products: Product[] }>(
    `/api/products/shop-by-age?age=${encodeURIComponent(age)}`
  );
}

export async function postContact(body: { name: string; email: string; message: string }) {
  return apiJson('/api/contact', { method: 'POST', body: JSON.stringify(body) });
}
