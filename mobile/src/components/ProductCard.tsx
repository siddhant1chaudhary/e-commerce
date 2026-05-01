import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';
import type { Product } from '../api/shop';
import { resolveImageUrl } from '../utils/images';

function sizeLabel(s: string | { label?: string; value?: string }) {
  return typeof s === 'string' ? s : s.label || s.value || '';
}

function sizeValue(s: string | { label?: string; value?: string }) {
  return typeof s === 'string' ? s : s.label || s.value || '';
}

type Props = { product: Product; navigation: NavigationProp<RootStackParamList>; fromListLabel?: string };

export function ProductCard({ product, navigation, fromListLabel }: Props) {
  const { user, addToCart } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [size, setSize] = useState<string>('');

  const hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0;
  const img = resolveImageUrl(product.mainImage || product.image || (product.images && product.images[0]));

  async function handleAdd() {
    if (!user) {
      toast.show({ type: 'info', message: 'Please login or sign up to add items to your cart' });
      navigation.navigate('Login');
      return;
    }
    if (hasSizes && !size) {
      toast.show({ type: 'info', message: 'Please select a size before adding to cart' });
      return;
    }
    setLoading(true);
    try {
      await addToCart({
        productId: product.id,
        qty: 1,
        title: product.title,
        price: Number(product.discountPrice ?? product.price ?? 0) || 0,
        image: img || undefined,
        sku: product.sku || product.skuCode || null,
        size: size || null,
      });
      toast.show({ type: 'success', message: 'Added to cart' });
    } catch (e) {
      toast.show({ type: 'error', message: e instanceof Error ? e.message : 'Add to cart failed' });
    } finally {
      setLoading(false);
    }
  }

  const price = product.discountPrice ?? product.price ?? 0;

  return (
    <View style={styles.card}>
      <Pressable onPress={() => navigation.navigate('ProductDetail', { id: product.id, fromLabel: fromListLabel })}>
        <Image source={{ uri: img || resolveImageUrl('/images/placeholder.png') }} style={styles.img} />
      </Pressable>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>
        {hasSizes ? (
          <View style={styles.pickerWrap}>
            {product.sizes!.map((s) => {
              const v = sizeValue(s);
              const active = size === v;
              return (
                <TouchableOpacity key={v} style={[styles.sizeChip, active && styles.sizeChipOn]} onPress={() => setSize(v)}>
                  <Text style={[styles.sizeChipTxt, active && styles.sizeChipTxtOn]}>{sizeLabel(s)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
        <View style={styles.row}>
          <Text style={styles.price}>₹{price}</Text>
          <Text style={styles.free}>Free delivery</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.addTxt}>Add to cart</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.detailBtn}
          onPress={() => navigation.navigate('ProductDetail', { id: product.id, fromLabel: fromListLabel })}
        >
          <Text style={styles.detailTxt}>Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginBottom: 12,
  },
  img: { width: '100%', height: 200, backgroundColor: '#f0f0f0' },
  body: { padding: 10, flex: 1 },
  title: { fontSize: 14, fontWeight: '600', minHeight: 36 },
  pickerWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  sizeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sizeChipOn: { borderColor: colors.primary, backgroundColor: 'rgba(125,196,195,0.12)' },
  sizeChipTxt: { fontSize: 12, color: colors.text },
  sizeChipTxtOn: { fontWeight: '700', color: colors.primary },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  price: { fontWeight: '700', fontSize: 15 },
  free: { fontSize: 11, color: colors.muted },
  addBtn: {
    marginTop: 10,
    backgroundColor: colors.accent,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  addTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  detailBtn: {
    marginTop: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
    alignItems: 'center',
  },
  detailTxt: { color: colors.primary, fontWeight: '600', fontSize: 13 },
});
