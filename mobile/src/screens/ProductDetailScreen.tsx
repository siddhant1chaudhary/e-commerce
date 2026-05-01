import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { fetchProduct, type Product } from '../api/shop';
import { ScreenLayout } from '../components/ScreenLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { RootStackParamList } from '../navigation/types';
import { colors, space } from '../theme';
import { resolveImageUrl } from '../utils/images';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

export function ProductDetailScreen({ navigation, route }: Props) {
  const { id, fromLabel } = route.params;
  const { user, addToCart } = useAuth();
  const toast = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const p = await fetchProduct(id);
      setProduct(p);
    } catch {
      setProduct(null);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const gallery = useMemo(() => {
    if (!product) return [];
    const imgs: string[] = [];
    if (product.mainImage) imgs.push(product.mainImage);
    if (Array.isArray(product.additionalImages)) imgs.push(...product.additionalImages);
    if (product.image) imgs.push(product.image);
    if (Array.isArray(product.images)) imgs.push(...product.images);
    return imgs.length ? Array.from(new Set(imgs.map((u) => resolveImageUrl(u)))) : [];
  }, [product]);

  useEffect(() => {
    if (gallery.length && !selectedImage) setSelectedImage(gallery[0]);
  }, [gallery, selectedImage]);

  const originalPrice = product ? Number(product.price ?? 0) : 0;
  const salePrice = product ? Number(product.discountPrice ?? product.price ?? 0) : 0;

  const avgRating = product
    ? Number(
        typeof product.rating === 'number'
          ? product.rating
          : (product.rating as { average?: number })?.average ?? 5
      ) || 5
    : 0;
  const ratingCount = product
    ? Number((product.rating as { count?: number })?.count ?? product.ratingCount ?? 5) || 5
    : 0;

  const sizeOptions = useMemo(() => {
    if (!product) return ['Onesize'];
    if (Array.isArray(product.sizes) && product.sizes.length) {
      return product.sizes.map((s) => (typeof s === 'string' ? s : s.label || s.value || 'Onesize'));
    }
    if (product.freeSize?.available) return ['FreeSize'];
    return ['Onesize'];
  }, [product]);

  async function handleAdd() {
    if (!product) return;
    if (!user) {
      toast.show({ type: 'info', message: 'Please login or sign up to add items to your cart' });
      navigation.navigate('Login');
      return;
    }
    const hasSizes =
      Array.isArray(sizeOptions) &&
      sizeOptions.length &&
      !(sizeOptions.length === 1 && sizeOptions[0] === 'Onesize');
    if (hasSizes && !selectedSize) {
      toast.show({ type: 'info', message: 'Please select a size before adding to cart' });
      return;
    }
    setLoading(true);
    try {
      await addToCart({
        productId: product.id,
        qty: 1,
        title: product.title,
        price: salePrice,
        image: selectedImage || gallery[0] || undefined,
        size: selectedSize,
        sku: product.sku || null,
      });
      toast.show({ type: 'success', message: 'Added to cart' });
    } catch (e) {
      toast.show({ type: 'error', message: e instanceof Error ? e.message : 'Add to cart failed' });
    } finally {
      setLoading(false);
    }
  }

  if (!product) {
    return (
      <ScreenLayout navigation={navigation}>
        <Text style={{ marginTop: 24 }}>Loading...</Text>
      </ScreenLayout>
    );
  }

  const main = selectedImage || gallery[0] || resolveImageUrl('/images/placeholder.png');

  return (
    <ScreenLayout navigation={navigation} breadcrumb={fromLabel ? `Home / ${fromLabel}` : 'Home / Product'}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backTxt}>← Back</Text>
      </TouchableOpacity>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
        {gallery.map((src) => (
          <TouchableOpacity key={src} onPress={() => setSelectedImage(src)} style={[styles.thumb, main === src && styles.thumbOn]}>
            <Image source={{ uri: src }} style={styles.thumbImg} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Image source={{ uri: main }} style={styles.hero} />

      <Text style={styles.brand}>{product.brand || 'Brand'}</Text>
      <Text style={styles.title}>{product.title}</Text>
      <Text style={styles.metaLine}>
        Category: {product.category || '—'} · Sub: {product.subCategory || '—'} · Age: {product.ageGroup || '—'}
      </Text>

      <View style={styles.ratingRow}>
        <Text style={styles.ratingBold}>{avgRating.toFixed(1)}</Text>
        <Text style={styles.ratingMuted}>| {ratingCount.toLocaleString()} Ratings</Text>
      </View>

      <View style={styles.hr} />

      <View style={styles.priceRow}>
        <Text style={styles.sale}>
          {product.currency || 'INR'} {salePrice}
        </Text>
        {originalPrice > salePrice ? (
          <Text style={styles.was}>
            {product.currency || 'INR'} {originalPrice}
          </Text>
        ) : null}
      </View>
      <Text style={styles.tax}>inclusive of all taxes</Text>

      <Text style={styles.sizeLabel}>SELECT SIZE</Text>
      <View style={styles.sizeRow}>
        {sizeOptions.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.sizePill, selectedSize === s && styles.sizePillOn]}
            onPress={() => setSelectedSize(s)}
          >
            <Text style={[styles.sizePillTxt, selectedSize === s && styles.sizePillTxtOn]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity
          style={styles.addCart}
          onPress={handleAdd}
          disabled={
            loading ||
            (Array.isArray(sizeOptions) &&
              sizeOptions.length > 0 &&
              !(sizeOptions.length === 1 && sizeOptions[0] === 'Onesize') &&
              !selectedSize)
          }
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.addCartTxt}>ADD TO CART</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.wish}
          onPress={() => toast.show({ type: 'info', message: 'Wishlist not implemented' })}
        >
          <Text style={styles.wishTxt}>WISHLIST</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.smallMeta}>
        <Text style={{ fontWeight: '700' }}>Delivery:</Text> Free delivery available{'\n'}
        <Text style={{ fontWeight: '700' }}>Seller:</Text>{' '}
        {typeof product.seller === 'object' && product.seller?.sellerName
          ? product.seller.sellerName
          : typeof product.seller === 'string'
            ? product.seller
            : 'Demo Seller'}
      </Text>
      {Array.isArray(product.tags) && product.tags.length > 0 ? (
        <View style={styles.tags}>
          {product.tags.map((t) => (
            <View key={t} style={styles.tag}>
              <Text style={styles.tagTxt}>{t}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <Text style={styles.highlights}>
        <Text style={{ fontWeight: '700' }}>Highlights:</Text>{' '}
        {(product.description || 'Quality product').slice(0, 120)}
      </Text>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  back: { marginBottom: space.md },
  backTxt: { color: colors.muted, fontSize: 14 },
  thumbRow: { marginBottom: 8, maxHeight: 88 },
  thumb: { marginRight: 8, borderRadius: 6, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
  thumbOn: { borderColor: colors.primary },
  thumbImg: { width: 72, height: 72 },
  hero: { width: '100%', height: 320, borderRadius: 8, resizeMode: 'contain', backgroundColor: '#fafafa', marginBottom: 12 },
  brand: { fontSize: 14, color: colors.muted, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  metaLine: { fontSize: 12, color: colors.muted, marginBottom: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  ratingBold: { fontWeight: '800', fontSize: 16 },
  ratingMuted: { marginLeft: 8, color: colors.muted, fontSize: 13 },
  hr: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  sale: { fontSize: 22, fontWeight: '800' },
  was: { fontSize: 16, color: colors.muted, textDecorationLine: 'line-through' },
  tax: { color: '#198754', fontSize: 12, marginTop: 4, marginBottom: 12 },
  sizeLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  sizeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  sizePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sizePillOn: { borderColor: colors.primary, backgroundColor: 'rgba(125,196,195,0.1)' },
  sizePillTxt: { fontSize: 13 },
  sizePillTxtOn: { fontWeight: '700', color: colors.primary },
  btnRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  addCart: {
    flex: 1,
    backgroundColor: colors.loginPink,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCartTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  wish: {
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  wishTxt: { fontWeight: '700', fontSize: 13 },
  smallMeta: { fontSize: 13, color: colors.muted, lineHeight: 20 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { backgroundColor: '#f1f3f5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  tagTxt: { fontSize: 12 },
  highlights: { marginTop: 10, fontSize: 13, color: colors.muted, lineHeight: 20 },
});
