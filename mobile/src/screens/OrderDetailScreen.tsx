import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { fetchOrder, postOrderReturn, putOrderStatus } from '../api/shop';
import { ScreenLayout } from '../components/ScreenLayout';
import { useToast } from '../context/ToastContext';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDetail'>;

export function OrderDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const toast = useToast();
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [returnReason, setReturnReason] = useState('');

  const load = useCallback(async () => {
    try {
      const o = await fetchOrder(id);
      setOrder(o as Record<string, unknown>);
    } catch {
      setOrder(null);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const status = String(order?.status || '');
  const canCancel = ['placed', 'in-progress', 'packed'].includes(status);

  async function cancelOrder() {
    Alert.alert('Cancel order', 'Are you sure you want to cancel this order?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          try {
            const updated = await putOrderStatus(id, {
              status: 'canceled',
              canceledBy: { role: 'user', name: 'User' },
            });
            setOrder(updated as Record<string, unknown>);
            toast.show({ type: 'success', message: 'Order canceled' });
          } catch (e) {
            toast.show({ type: 'error', message: e instanceof Error ? e.message : 'Cancel failed' });
          }
        },
      },
    ]);
  }

  async function submitReturn() {
    if (status !== 'delivered') {
      toast.show({ type: 'error', message: 'Return is only available after delivery.' });
      return;
    }
    try {
      await postOrderReturn(id, returnReason.trim());
      setReturnReason('');
      await load();
      toast.show({ type: 'success', message: 'Return requested' });
    } catch (e) {
      toast.show({ type: 'error', message: e instanceof Error ? e.message : 'Return request failed' });
    }
  }

  if (!order) {
    return (
      <ScreenLayout navigation={navigation}>
        <ActivityIndicator style={{ marginTop: 24 }} />
      </ScreenLayout>
    );
  }

  const items = (order.items as { title?: string; qty?: number; price?: number }[]) || [];

  return (
    <ScreenLayout navigation={navigation} breadcrumb={`Home / Order / ${id}`}>
      <Text style={styles.h1}>Order #{id}</Text>
      <Text style={styles.status}>Status: {status}</Text>

      {items.map((it, i) => (
        <View key={i} style={styles.line}>
          <Text style={styles.lineTitle}>{it.title}</Text>
          <Text style={styles.muted}>
            Qty {it.qty} × ₹{it.price} = ₹{((Number(it.price) || 0) * (Number(it.qty) || 0)).toFixed(2)}
          </Text>
        </View>
      ))}

      {canCancel ? (
        <TouchableOpacity style={styles.dangerBtn} onPress={cancelOrder}>
          <Text style={styles.dangerTxt}>Cancel order</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.returnLabel}>Return reason (optional)</Text>
      <TextInput
        style={styles.input}
        value={returnReason}
        onChangeText={setReturnReason}
        placeholder="Describe the issue"
        multiline
      />
      <TouchableOpacity style={styles.outlineBtn} onPress={submitReturn}>
        <Text style={styles.outlineTxt}>Submit return request</Text>
      </TouchableOpacity>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  status: { marginBottom: 16, color: colors.muted },
  line: { marginBottom: 10, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  lineTitle: { fontWeight: '700' },
  muted: { color: colors.muted, fontSize: 13, marginTop: 2 },
  dangerBtn: {
    marginTop: 16,
    backgroundColor: colors.danger,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerTxt: { color: '#fff', fontWeight: '800' },
  outlineBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  outlineTxt: { fontWeight: '700' },
  returnLabel: { marginTop: 16, fontWeight: '700', fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    minHeight: 72,
    marginTop: 6,
    marginBottom: 8,
    textAlignVertical: 'top',
  },
});
