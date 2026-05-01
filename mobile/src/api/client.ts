import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config';

const TOKEN_KEY = 'demo_ecommerce_jwt';
const CART_ID_KEY = 'demo_ecommerce_cart_id';

export async function setAuthToken(token: string | null): Promise<void> {
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function setCartId(cartId: string | null): Promise<void> {
  if (cartId) await AsyncStorage.setItem(CART_ID_KEY, cartId);
  else await AsyncStorage.removeItem(CART_ID_KEY);
}

export async function getCartId(): Promise<string | null> {
  return AsyncStorage.getItem(CART_ID_KEY);
}

async function authHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {};
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // SecureStore unavailable on some web builds
  }
  const cartId = await getCartId();
  if (cartId) headers['x-cart-id'] = cartId;
  return headers;
}

export type CartShape = { id: string; items: unknown[]; userId?: string | null };

/** Persist cart id from API responses (guest or logged-in cart). */
export async function rememberCartFromResponse(data: unknown): Promise<void> {
  if (data && typeof data === 'object' && 'id' in data && typeof (data as CartShape).id === 'string') {
    await setCartId((data as CartShape).id);
  }
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const p = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${p}`;
  const baseHeaders = await authHeaders();
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...baseHeaders,
      ...(init.headers as Record<string, string>),
    },
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg =
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `${res.status} ${res.statusText}`;
    const err = new Error(msg);
    (err as Error & { status?: number; body?: unknown }).status = res.status;
    (err as Error & { body?: unknown }).body = data;
    throw err;
  }
  return data as T;
}
