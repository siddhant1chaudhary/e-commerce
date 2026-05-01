import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getCartId, setAuthToken } from '../api/client';
import {
  Cart,
  fetchCart,
  loginRequest,
  logoutRequest,
  mergeGuestCart,
  postCartLine,
  putCartItems,
  type CartLine,
  type UserPublic,
} from '../api/shop';

const USER_KEY = 'demo_user';

type AuthContextValue = {
  user: UserPublic | null;
  cart: Cart | null;
  cartCount: number;
  refreshCart: () => Promise<Cart | null>;
  login: (email: string, password: string) => Promise<UserPublic>;
  applySessionFromLoginResponse: (data: UserPublic & { token?: string }) => Promise<void>;
  logout: () => Promise<void>;
  addToCart: (args: {
    productId: string;
    qty?: number;
    title?: string;
    price?: number;
    image?: string;
    sku?: string | null;
    size?: string | null;
  }) => Promise<Cart>;
  clearCart: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function stripUser(data: UserPublic & { token?: string; csrf?: string }): UserPublic {
  const { token: _t, csrf: _c, ...rest } = data as UserPublic & { token?: string; csrf?: string };
  return rest;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);

  const refreshCart = useCallback(async () => {
    try {
      const c = await fetchCart();
      setCart(c);
      return c;
    } catch {
      setCart(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(USER_KEY);
        if (!cancelled && raw) {
          const u = JSON.parse(raw) as UserPublic;
          setUser(u);
        }
      } catch {
        if (!cancelled) setUser(null);
      }
      if (!cancelled) await refreshCart();
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshCart]);

  const applySessionFromLoginResponse = useCallback(
    async (data: UserPublic & { token?: string }) => {
      if (data.token) await setAuthToken(data.token);
      const pub = stripUser(data as UserPublic & { token?: string; csrf?: string });
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(pub));
      setUser(pub);
      const guestCartId = await getCartId();
      try {
        await mergeGuestCart(guestCartId);
      } catch {
        /* ignore */
      }
      await refreshCart();
    },
    [refreshCart]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await loginRequest(email, password);
      await applySessionFromLoginResponse(data);
      return stripUser(data);
    },
    [applySessionFromLoginResponse]
  );

  const logout = useCallback(async () => {
    setUser(null);
    setCart(null);
    try {
      await AsyncStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
    await logoutRequest();
    await refreshCart();
  }, [refreshCart]);

  const addToCart = useCallback(async (args: Parameters<AuthContextValue['addToCart']>[0]) => {
    const updated = await postCartLine({
      productId: args.productId,
      qty: args.qty ?? 1,
      title: args.title,
      price: args.price,
      image: args.image,
      sku: args.sku ?? null,
      size: args.size ?? null,
    });
    setCart(updated);
    return updated;
  }, []);

  const clearCart = useCallback(async () => {
    const empty: CartLine[] = [];
    const updated = await putCartItems(empty);
    setCart(updated);
  }, []);

  const cartCount = useMemo(
    () => (cart?.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0),
    [cart]
  );

  const value = useMemo(
    () => ({
      user,
      cart,
      cartCount,
      refreshCart,
      login,
      applySessionFromLoginResponse,
      logout,
      addToCart,
      clearCart,
    }),
    [user, cart, cartCount, refreshCart, login, applySessionFromLoginResponse, logout, addToCart, clearCart]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
