import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import type { RootStackParamList } from './types';
import { CartScreen } from '../screens/CartScreen';
import { CheckoutScreen } from '../screens/CheckoutScreen';
import { ContactScreen } from '../screens/ContactScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { NavCategoryScreen } from '../screens/NavCategoryScreen';
import { OrderDetailScreen } from '../screens/OrderDetailScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { PaymentScreen } from '../screens/PaymentScreen';
import { ProductCategoryScreen } from '../screens/ProductCategoryScreen';
import { ProductDetailScreen } from '../screens/ProductDetailScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ShopByAgeScreen } from '../screens/ShopByAgeScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { WebPageScreen } from '../screens/WebPageScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="ProductCategory" component={ProductCategoryScreen} />
      <Stack.Screen name="NavCategory" component={NavCategoryScreen} />
      <Stack.Screen name="ShopByAge" component={ShopByAgeScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="Contact" component={ContactScreen} />
      <Stack.Screen name="WebPage" component={WebPageScreen} />
    </Stack.Navigator>
  );
}
