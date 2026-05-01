import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { CartLine } from '../api/shop';
import { putCartItems } from '../api/shop';
import { ScreenLayout } from '../components/ScreenLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';
import { resolveImageUrl } from '../utils/images';

type Props = NativeStackScreenProps<RootStackParamList, 'Cart'>;

function isSameCartLine(a: CartLine, b: CartLine) {
  if (!a || !b) return false;
  if (a.productId !== b.productId) return false;
  return String(a.size ?? '') === String(b.size ?? '');
}

function lineKey(item: CartLine) {
  return `${item.productId}::${String(item.size ?? '')}`;
}

export function CartScreen({ navigation }: Props) {
  const { cart, refreshCart } = useAuth();
  const toast = useToast();
  const [local, setLocal] = useState(cart);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocal(cart);
  }, [cart]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  async function saveItems(items: CartLine[]) {
    setSaving(true);
    try {
      const updated = await putCartItems(items);
      setLocal(updated);
      await refreshCart();
      toast.show({ type: 'success', message: 'Cart updated' });
    } catch (e) {
      toast.show({ type: 'error', message: e instanceof Error ? e.message : 'Could not update cart' });
    } finally {
      setSaving(false);
    }
  }

  function changeQty(line: CartLine, delta: number) {
    if (!local) return;
    const items = local.items
      .map((i) => (isSameCartLine(i, line) ? { ...i, qty: Math.max(0, (Number(i.qty) || 0) + delta) } : i))
      .filter((i) => (Number(i.qty) || 0) > 0);
    setLocal({ ...local, items });
    saveItems(items);
  }

  function setQty(line: CartLine, qty: string) {
    if (!local) return;
    const n = Math.max(0, Number(qty) || 0);
    const items = local.items
      .map((i) => (isSameCartLine(i, line) ? { ...i, qty: n } : i))
      .filter((i) => (Number(i.qty) || 0) > 0);
    setLocal({ ...local, items });
    saveItems(items);
  }

  function removeItem(line: CartLine) {
    if (!local) return;
    const items = local.items.filter((i) => !isSameCartLine(i, line));
    setLocal({ ...local, items });
    saveItems(items);
  }

  if (!local || !local.items?.length) {
    return (
      <ScreenLayout navigation={navigation} breadcrumb="Home / Cart">
        <Text style={styles.h1}>Your Cart</Text>
        <View style={styles.emptyCard}>
          <Text style={styles.muted}>Your cart is empty.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.primaryBtnTxt}>Continue shopping</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  const subtotal = local.items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);

  return (
    <ScreenLayout navigation={navigation} breadcrumb="Home / Cart">
      <Text style={styles.h1}>Your Cart ({local.items.length})</Text>
      {local.items.map((item) => (
        <View key={lineKey(item)} style={styles.line}>
          <Image source={{ uri: resolveImageUrl(item.image || '/images/placeholder.png') }} style={styles.img} />
          <View style={styles.lineBody}>
            <View style={styles.lineTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineTitle}>
                  {item.title}
                  {item.size ? ` — ${item.size}` : ''}
                </Text>
                <Text style={styles.muted}>₹{item.price}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.lineTotal}>₹{((Number(item.price) || 0) * (Number(item.qty) || 0)).toFixed(2)}</Text>
                <TouchableOpacity onPress={() => removeItem(item)}>
                  <Text style={styles.remove}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.qtyRow}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => changeQty(item, -1)} disabled={saving || (Number(item.qty) || 0) <= 1}>
                <Text>−</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.qtyInput}
                keyboardType="number-pad"
                value={String(item.qty ?? 0)}
                onChangeText={(t) => setQty(item, t)}
              />
              <TouchableOpacity style={styles.qtyBtn} onPress={() => changeQty(item, 1)} disabled={saving}>
                <Text>+</Text>
              </TouchableOpacity>
              <Text style={styles.qtyLbl}>Qty</Text>
            </View>
          </View>
        </View>
      ))}

      <View style={styles.summary}>
        <Text style={styles.sumTitle}>Price Details</Text>
        <View style={styles.sumRow}>
          <Text style={styles.muted}>Subtotal</Text>
          <Text>₹{subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.sumRow}>
          <Text style={styles.muted}>Delivery</Text>
          <Text style={styles.free}>Free</Text>
        </View>
        <View style={styles.hr} />
        <View style={styles.sumRow}>
          <Text style={styles.total}>Total</Text>
          <Text style={styles.total}>₹{subtotal.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.place} disabled={saving} onPress={() => navigation.navigate('Checkout')}>
          <Text style={styles.placeTxt}>{saving ? 'Processing...' : 'Place Order'}</Text>
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  emptyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  muted: { color: colors.muted },
  primaryBtn: { marginTop: 16, backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  primaryBtnTxt: { color: '#fff', fontWeight: '700' },
  line: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  img: { width: 100, height: 100, borderRadius: 6 },
  lineBody: { flex: 1, marginLeft: 12 },
  lineTop: { flexDirection: 'row' },
  lineTitle: { fontWeight: '700', fontSize: 15 },
  lineTotal: { fontWeight: '600' },
  remove: { color: colors.danger, marginTop: 4, fontSize: 13 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  qtyBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  qtyInput: {
    width: 48,
    height: 36,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
    borderRadius: 6,
  },
  qtyLbl: { marginLeft: 8, color: colors.muted, fontSize: 13 },
  summary: {
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
  },
  sumTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  hr: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 8 },
  free: { color: '#198754' },
  total: { fontWeight: '800', fontSize: 16 },
  place: { marginTop: 14, backgroundColor: colors.danger, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  placeTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
