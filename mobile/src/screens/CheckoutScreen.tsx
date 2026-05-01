import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { applyCoupon, fetchAddresses, fetchProfile, type Address } from '../api/shop';
import { ScreenLayout } from '../components/ScreenLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

export function CheckoutScreen({ navigation }: Props) {
  const { cart, refreshCart, user } = useAuth();
  const toast = useToast();
  const [shipping, setShipping] = useState({ name: '', phone: '', address: '', email: '' });
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<{ discount?: number; coupon?: { code: string } } | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  useEffect(() => {
    if (!user) return;
    fetchProfile()
      .then((d) => {
        setProfileName(d?.name || '');
        setProfileEmail(d?.email || '');
        setShipping((prev) => ({
          ...prev,
          email: (prev.email || '').trim() ? prev.email : d?.email || '',
        }));
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchAddresses()
      .then((d) => {
        const list = d.addresses || [];
        setAddresses(list);
        const def = list.find((a) => a.isDefault) || list[0];
        if (def) {
          setSelectedAddressId(def.id);
          setShipping((prev) => ({
            name: profileName || def.name || '',
            phone: def.phone || '',
            address: def.address || '',
            email: (prev.email || '').trim() ? prev.email : profileEmail || '',
          }));
        }
      })
      .catch(() => setAddresses([]));
  }, [user]);

  useEffect(() => {
    if (!user || !Array.isArray(addresses) || !selectedAddressId) return;
    const sel = addresses.find((a) => a.id === selectedAddressId);
    if (!sel) return;
    setShipping((prev) => ({
      name: profileName || sel.name || '',
      phone: sel.phone || '',
      address: sel.address || '',
      email: (prev.email || '').trim() ? prev.email : profileEmail || prev.email || '',
    }));
  }, [user, addresses, selectedAddressId, profileName, profileEmail]);

  const subtotal = useMemo(
    () => (cart?.items || []).reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0), 0),
    [cart]
  );
  const discount = couponResult?.discount || 0;
  const total = Math.max(0, subtotal - discount);

  async function onApplyCoupon() {
    if (!couponCode) {
      setCouponResult(null);
      return;
    }
    setApplying(true);
    try {
      const data = await applyCoupon(couponCode, subtotal);
      setCouponResult(data);
      toast.show({ type: 'success', message: `Coupon applied: -₹${data.discount ?? 0}` });
    } catch (e) {
      setCouponResult(null);
      toast.show({ type: 'error', message: e instanceof Error ? e.message : 'Coupon apply failed' });
    } finally {
      setApplying(false);
    }
  }

  function proceedToPayment() {
    if (!cart?.items?.length) {
      toast.show({ type: 'error', message: 'Cart is empty' });
      return;
    }
    let finalShipping = { ...shipping };
    if (user && selectedAddressId && Array.isArray(addresses)) {
      const sel = addresses.find((a) => a.id === selectedAddressId);
      if (sel) {
        finalShipping = {
          name: profileName || shipping.name,
          phone: sel.phone || '',
          address: sel.address || '',
          email: (shipping.email || profileEmail || '').trim(),
        };
      }
    }
    if (!finalShipping.name || !finalShipping.phone || !finalShipping.address) {
      toast.show({ type: 'error', message: 'Please fill shipping details' });
      return;
    }
    const em = (finalShipping.email || profileEmail || '').trim();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      toast.show({ type: 'error', message: 'Please enter a valid email for order updates' });
      return;
    }
    finalShipping = { ...finalShipping, email: em };
    navigation.navigate('Payment', {
      shipping: finalShipping,
      couponCode: couponResult?.coupon?.code || couponCode || null,
      subtotal,
      discount,
      total,
    });
  }

  return (
    <ScreenLayout navigation={navigation} breadcrumb="Home / Checkout">
      <Text style={styles.h1}>Checkout</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Shipping details</Text>
        {user && Array.isArray(addresses) && addresses.length > 0 ? (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.lbl}>Saved address</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {addresses.map((a) => {
                const on = selectedAddressId === a.id;
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.addrChip, on && styles.addrChipOn]}
                    onPress={() => setSelectedAddressId(a.id)}
                  >
                    <Text style={styles.addrChipTxt} numberOfLines={2}>
                      {(a.name || '') + (a.phone ? ` (${a.phone})` : '')}
                      {a.isDefault ? ' • Default' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
        <Text style={styles.lbl}>Full name</Text>
        <TextInput style={styles.input} value={shipping.name} onChangeText={(t) => setShipping({ ...shipping, name: t })} />
        <Text style={styles.lbl}>Phone</Text>
        <TextInput style={styles.input} value={shipping.phone} onChangeText={(t) => setShipping({ ...shipping, phone: t })} keyboardType="phone-pad" />
        <Text style={styles.lbl}>Email</Text>
        <TextInput
          style={styles.input}
          value={shipping.email}
          onChangeText={(t) => setShipping({ ...shipping, email: t })}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text style={styles.lbl}>Address</Text>
        <TextInput
          style={[styles.input, { minHeight: 80 }]}
          multiline
          value={shipping.address}
          onChangeText={(t) => setShipping({ ...shipping, address: t })}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment & coupon</Text>
        <View style={styles.couponRow}>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="Enter coupon code" value={couponCode} onChangeText={setCouponCode} />
          <TouchableOpacity style={styles.outlineBtn} onPress={onApplyCoupon} disabled={applying}>
            <Text style={styles.outlineBtnTxt}>Apply</Text>
          </TouchableOpacity>
        </View>
        {couponResult ? (
          <Text style={styles.ok}>Coupon {couponResult.coupon?.code} applied — saved ₹{couponResult.discount}</Text>
        ) : couponCode ? (
          <Text style={styles.muted}>Tap Apply to validate coupon</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Order summary</Text>
        <View style={styles.row}>
          <Text>Subtotal</Text>
          <Text>₹{subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text>Discount</Text>
          <Text>-₹{discount.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text>Delivery</Text>
          <Text style={styles.free}>Free</Text>
        </View>
        <View style={styles.hr} />
        <View style={styles.row}>
          <Text style={styles.bold}>Total</Text>
          <Text style={styles.bold}>₹{total.toFixed(2)}</Text>
        </View>
        {(cart?.items || []).map((it) => (
          <View key={`${it.productId}-${it.size}`} style={styles.itemRow}>
            <Text style={styles.itemTxt} numberOfLines={2}>
              {it.title} · Qty {it.qty} · ₹{it.price}
            </Text>
            <Text>₹{((Number(it.price) || 0) * (Number(it.qty) || 0)).toFixed(2)}</Text>
          </View>
        ))}
        <TouchableOpacity style={styles.proceed} onPress={proceedToPayment}>
          <Text style={styles.proceedTxt}>Proceed to payment</Text>
        </TouchableOpacity>
        <Text style={styles.terms}>By placing the order you agree to our Terms.</Text>
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
  lbl: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    fontSize: 15,
  },
  addrChip: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    maxWidth: 220,
  },
  addrChipOn: { borderColor: colors.accent, backgroundColor: '#fff5f3' },
  addrChipTxt: { fontSize: 12 },
  couponRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  outlineBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: colors.primary },
  outlineBtnTxt: { color: colors.primary, fontWeight: '700' },
  ok: { color: '#198754', fontSize: 13, marginTop: 6 },
  muted: { color: colors.muted, fontSize: 12, marginTop: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  hr: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 8 },
  free: { color: '#198754' },
  bold: { fontWeight: '800', fontSize: 16 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  itemTxt: { flex: 1, fontSize: 12, color: colors.muted },
  proceed: {
    marginTop: 14,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  proceedTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  terms: { textAlign: 'center', fontSize: 11, color: colors.muted, marginTop: 10 },
});
