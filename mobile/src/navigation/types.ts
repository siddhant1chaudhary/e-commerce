import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  ProductCategory: { category: string; title: string };
  NavCategory: { categorySlug: string; subSlug: string; title?: string };
  ShopByAge: { ageSlug: string };
  ProductDetail: { id: string; fromLabel?: string };
  Cart: undefined;
  Checkout: undefined;
  Payment: {
    shipping: Record<string, string>;
    couponCode: string | null;
    subtotal: number;
    discount: number;
    total: number;
  };
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  Profile: undefined;
  Orders: undefined;
  OrderDetail: { id: string };
  Contact: undefined;
  WebPage: { path: string; title: string };
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
