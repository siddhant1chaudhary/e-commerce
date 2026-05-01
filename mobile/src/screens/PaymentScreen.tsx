import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { checkoutOrder } from '../api/shop';
import { ScreenLayout } from '../components/ScreenLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Payment'>;

export function PaymentScreen({ navigation, route }: Props) {
  const { shipping, couponCode, subtotal, discount, total } = route.params;
  const { refreshCart } = useAuth();
  const toast = useToast();
  const [methodType] = useState<'COD'>('COD');
  const [processing, setProcessing] = useState(false);

  async function submitOrder() {
    setProcessing(true);
    try {
      const data = await checkoutOrder({
        shipping,
        paymentMethod: methodType === 'COD' ? 'COD' : 'COD',
        couponCode: couponCode || null,
      });
      toast.show({ type: 'success', message: 'Order placed successfully' });
      await refreshCart();
      navigation.replace('OrderDetail', { id: data.orderId });
    } catch (e) {
      toast.show({ type: 'error', message: e instanceof Error ? e.message : 'Payment failed' });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <ScreenLayout navigation={navigation} breadcrumb="Home / Checkout / Payment">
      <Text style={styles.h1}>Payment</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Choose payment option</Text>
        <View style={styles.radioRow}>
          <View style={styles.dot} />
          <Text style={styles.radioTxt}>Cash on Delivery</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Order summary</Text>
        <View style={styles.row}>
          <Text>Subtotal</Text>
          <Text>₹{(subtotal || 0).toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text>Discount</Text>
          <Text>-₹{(discount || 0).toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text>Delivery</Text>
          <Text style={styles.free}>Free</Text>
        </View>
        <View style={styles.hr} />
        <View style={styles.row}>
          <Text style={styles.bold}>Total</Text>
          <Text style={styles.bold}>₹{(total || 0).toFixed(2)}</Text>
        </View>
        <Text style={styles.subTitle}>Shipping</Text>
        <Text>{shipping?.name}</Text>
        <Text style={styles.muted}>{shipping?.phone}</Text>
        <Text style={styles.muted}>{shipping?.address}</Text>

        <TouchableOpacity style={styles.pay} disabled={processing} onPress={submitOrder}>
          <Text style={styles.payTxt}>{processing ? 'Processing...' : 'Place Order (COD)'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Checkout')}>
          <Text style={styles.backLink}>Back to checkout</Text>
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  radioTxt: { fontSize: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  hr: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 8 },
  free: { color: '#198754' },
  bold: { fontWeight: '800', fontSize: 16 },
  subTitle: { fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  muted: { color: colors.muted, fontSize: 13 },
  pay: {
    marginTop: 16,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  payTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  backLink: { textAlign: 'center', marginTop: 12, color: colors.muted, fontSize: 13 },
});
