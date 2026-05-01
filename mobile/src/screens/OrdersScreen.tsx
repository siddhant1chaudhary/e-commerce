import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fetchOrders } from '../api/shop';
import { ScreenLayout } from '../components/ScreenLayout';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Orders'>;

type OrderRow = { id?: string; status?: string; createdAt?: string; total?: number };

export function OrdersScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setErr(null);
    try {
      const list = await fetchOrders();
      setOrders(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
      setOrders([]);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) {
    return (
      <ScreenLayout navigation={navigation}>
        <Text style={styles.muted}>Please login to view your orders.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.btnTxt}>Login</Text>
        </TouchableOpacity>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout navigation={navigation} breadcrumb="Home / My orders">
      <Text style={styles.h1}>My Orders</Text>
      {!orders && !err ? <ActivityIndicator style={{ marginTop: 24 }} /> : null}
      {err ? <Text style={styles.err}>{err}</Text> : null}
      {(orders || []).map((o) => (
        <TouchableOpacity key={o.id} style={styles.row} onPress={() => o.id && navigation.navigate('OrderDetail', { id: o.id })}>
          <View>
            <Text style={styles.id}>Order #{o.id}</Text>
            <Text style={styles.muted}>{o.status}</Text>
            <Text style={styles.muted}>{o.createdAt ? new Date(o.createdAt).toLocaleString() : ''}</Text>
          </View>
          <Text style={styles.total}>₹{Number(o.total || 0).toFixed(2)}</Text>
        </TouchableOpacity>
      ))}
      {orders?.length === 0 ? <Text style={styles.muted}>No orders yet.</Text> : null}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  id: { fontWeight: '700' },
  total: { fontWeight: '800', fontSize: 16 },
  muted: { color: colors.muted, fontSize: 13 },
  err: { color: colors.danger },
  btn: { marginTop: 12, backgroundColor: colors.accent, padding: 12, borderRadius: 8, alignSelf: 'flex-start' },
  btnTxt: { color: '#fff', fontWeight: '700' },
});
