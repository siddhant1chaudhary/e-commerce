import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { fetchProducts, type Product } from '../api/shop';
import { ProductCard } from '../components/ProductCard';
import { ScreenLayout } from '../components/ScreenLayout';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductCategory'>;

export function ProductCategoryScreen({ navigation, route }: Props) {
  const { category, title } = route.params;
  const [products, setProducts] = useState<Product[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const list = await fetchProducts({ category });
      setProducts(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
      setProducts([]);
    }
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScreenLayout navigation={navigation} breadcrumb={`Home / ${title}`}>
      <Text style={styles.h1}>{title}</Text>
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
            <ProductCard product={p} navigation={navigation} fromListLabel={title} />
          </View>
        ))}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%' },
  err: { color: colors.danger },
  empty: { padding: 16, backgroundColor: '#e7f1ff', borderRadius: 8 },
  muted: { color: colors.muted },
});
