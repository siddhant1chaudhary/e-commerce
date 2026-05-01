import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fetchShopByAge, type Product } from '../api/shop';
import { ProductCard } from '../components/ProductCard';
import { ScreenLayout } from '../components/ScreenLayout';
import { SHOP_BY_AGE_GROUPS } from '../data/ageGroups';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ShopByAge'>;

export function ShopByAgeScreen({ navigation, route }: Props) {
  const { ageSlug } = route.params;
  const [data, setData] = useState<{ age: string; products: Product[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const meta = SHOP_BY_AGE_GROUPS.find((g) => g.value === data?.age);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetchShopByAge(ageSlug);
      setData(res);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
      setData(null);
    }
  }, [ageSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const title = data?.age ? `Shop by Age — ${meta?.label || data.age}` : 'Shop by Age';

  return (
    <ScreenLayout navigation={navigation} breadcrumb={`Home / Shop by Age / ${meta?.label || ageSlug}`}>
      <Text style={styles.h1}>{title}</Text>
      {meta?.description ? <Text style={styles.desc}>{meta.description}</Text> : null}

      <View style={styles.tabs}>
        {SHOP_BY_AGE_GROUPS.map((g) => {
          const on = data?.age === g.value || ageSlug === g.value;
          return (
            <TouchableOpacity
              key={g.value}
              style={[styles.tab, on && styles.tabOn]}
              onPress={() => navigation.setParams({ ageSlug: g.value })}
            >
              <Text style={[styles.tabTxt, on && styles.tabTxtOn]}>{g.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {!data && !err ? <ActivityIndicator style={{ marginTop: 24 }} /> : null}
      {err ? <Text style={styles.err}>{err}</Text> : null}

      <View style={styles.grid}>
        {(data?.products || []).map((p) => (
          <View key={p.id} style={styles.gridItem}>
            <ProductCard product={p} navigation={navigation} fromListLabel={title} />
          </View>
        ))}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  desc: { fontSize: 13, color: colors.muted, marginBottom: 12 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabTxt: { fontSize: 12, fontWeight: '600' },
  tabTxtOn: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%' },
  err: { color: colors.danger, marginBottom: 8 },
});
