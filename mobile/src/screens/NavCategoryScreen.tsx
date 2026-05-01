import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fetchProducts, type Product } from '../api/shop';
import { ProductCard } from '../components/ProductCard';
import { ScreenLayout } from '../components/ScreenLayout';
import { navHeader } from '../data/navHeader';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'NavCategory'>;

export function NavCategoryScreen({ navigation, route }: Props) {
  const { categorySlug, subSlug, title } = route.params;
  const [products, setProducts] = useState<Product[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const catObj = useMemo(
    () => navHeader.find((c) => c.subTitle.toLowerCase() === categorySlug.toLowerCase()),
    [categorySlug]
  );

  const displayTitle = title || catObj?.title || categorySlug;

  const load = useCallback(async () => {
    setErr(null);
    try {
      const q: Record<string, string> = { category: categorySlug };
      if (subSlug && subSlug !== 'all') q.subCategory = subSlug;
      const list = await fetchProducts(q);
      setProducts(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
      setProducts([]);
    }
  }, [categorySlug, subSlug]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScreenLayout navigation={navigation} breadcrumb={`Home / ${displayTitle}`}>
      <Text style={styles.h1}>{displayTitle}</Text>
      {catObj ? (
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, subSlug === 'all' && styles.tabOn]}
            onPress={() => navigation.setParams({ categorySlug, subSlug: 'all' })}
          >
            <Text style={[styles.tabTxt, subSlug === 'all' && styles.tabTxtOn]}>All</Text>
          </TouchableOpacity>
          {(catObj.items || []).map((it) => {
            const parts = it.href.split('/').filter(Boolean);
            const sub = parts[1] || 'all';
            const on = subSlug === sub;
            return (
              <TouchableOpacity
                key={it.href}
                style={[styles.tab, on && styles.tabOn]}
                onPress={() => navigation.setParams({ categorySlug, subSlug: sub })}
              >
                <Text style={[styles.tabTxt, on && styles.tabTxtOn]} numberOfLines={1}>
                  {it.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {!products && !err ? <ActivityIndicator style={{ marginTop: 24 }} /> : null}
      {err ? <Text style={styles.err}>{err}</Text> : null}
      {!products?.length && products ? (
        <View style={styles.empty}>
          <Text style={styles.muted}>No products found.</Text>
        </View>
      ) : null}

      <View style={styles.grid}>
        {(products || []).map((p) => (
          <View key={p.id} style={styles.gridItem}>
            <ProductCard product={p} navigation={navigation} fromListLabel={displayTitle} />
          </View>
        ))}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 20, fontWeight: '700', marginBottom: 10 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
  },
  tabOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabTxt: { fontSize: 12, fontWeight: '600', color: colors.text, maxWidth: 120 },
  tabTxtOn: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%' },
  err: { color: colors.danger },
  empty: { padding: 16, backgroundColor: '#e7f1ff', borderRadius: 8 },
  muted: { color: colors.muted },
});
