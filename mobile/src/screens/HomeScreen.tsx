import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { marketingUri } from '../constants/marketingAssets';
import { fetchProducts, type Product } from '../api/shop';
import { BannerCarousel } from '../components/BannerCarousel';
import { ProductCard } from '../components/ProductCard';
import { ScreenLayout } from '../components/ScreenLayout';
import { HOME_AGE_TILES } from '../data/ageGroups';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

function sortKey(p: Product) {
  const t = p?.createdAt ? new Date(p.createdAt).getTime() : NaN;
  if (Number.isFinite(t)) return t;
  const n = Number.parseInt(String(p?.id || '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

export function HomeScreen({ navigation }: Props) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const list = await fetchProducts();
      setProducts(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const trending = useMemo(() => {
    if (!products?.length) return [];
    return [...products].sort((a, b) => sortKey(b) - sortKey(a)).slice(0, 4);
  }, [products]);

  const best = useMemo(() => {
    if (!products?.length) return [];
    return [...products].sort((a, b) => sortKey(a) - sortKey(b)).slice(0, 4);
  }, [products]);

  return (
    <ScreenLayout navigation={navigation} breadcrumb="Home">
      <BannerCarousel />

      <View style={styles.ageHeader}>
        <Text style={styles.ageTitle}>Shop by Age</Text>
      </View>
      <View style={styles.ageGrid}>
        {HOME_AGE_TILES.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.ageTile}
            onPress={() => navigation.navigate('ShopByAge', { ageSlug: c.ageQuery })}
          >
            <View style={styles.ageCircle}>
              <Image
                source={{ uri: marketingUri(c.marketingFile) }}
                style={styles.ageImg}
                resizeMode="cover"
                accessibilityLabel={c.title}
              />
            </View>
            <Text style={styles.ageTileTitle}>{c.title}</Text>
            <Text style={styles.ageTileSub}>{c.age}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* <View style={styles.quickRow}>
        {[
          { t: 'Men', cat: 'men' },
          { t: 'Women', cat: 'women' },
          { t: 'Kids', cat: 'kids' },
          { t: 'GenZ', cat: 'genz' },
          { t: 'Beauty', cat: 'beauty' },
          { t: 'Studio', cat: 'studio' },
        ].map((x) => (
          <TouchableOpacity
            key={x.cat}
            style={styles.quickPill}
            onPress={() => navigation.navigate('ProductCategory', { category: x.cat, title: x.t })}
          >
            <Text style={styles.quickPillTxt}>{x.t}</Text>
          </TouchableOpacity>
        ))}
      </View> */}

      {!products && !err ? (
        <ActivityIndicator style={{ marginVertical: 24 }} />
      ) : null}
      {err ? <Text style={styles.err}>{err}</Text> : null}

      <Text style={styles.sectionTitle}>Trending styles</Text>
      <View style={styles.grid}>
        {trending.map((p) => (
          <View key={p.id} style={styles.gridItem}>
            <ProductCard product={p} navigation={navigation} fromListLabel="Home · Trending" />
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Best Sellers</Text>
      <View style={styles.grid}>
        {best.map((p) => (
          <View key={p.id} style={styles.gridItem}>
            <ProductCard product={p} navigation={navigation} fromListLabel="Home · Best sellers" />
          </View>
        ))}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  ageHeader: { alignItems: 'center', marginBottom: 12 },
  ageTitle: { fontSize: 18, fontWeight: '700', color: colors.accent },
  ageGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  ageTile: { width: '48%', alignItems: 'center', marginBottom: 12 },
  ageCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
    backgroundColor: '#fff5f3',
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageImg: { width: 110, height: 110, borderRadius: 55 },
  ageTileTitle: { marginTop: 8, fontWeight: '700', fontSize: 15 },
  ageTileSub: { fontSize: 11, color: colors.muted },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  quickPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.lightBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  quickPillTxt: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%' },
  err: { color: colors.danger, marginBottom: 8 },
});
