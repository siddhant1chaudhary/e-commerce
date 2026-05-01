import React, { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { MARKETING, marketingUri } from '../constants/marketingAssets';
import { colors } from '../theme';

export function BannerCarousel() {
  const W = Dimensions.get('window').width - 32;
  const slideHeight = useMemo(() => Math.min(260, Math.max(200, Math.round(W * 0.52))), [W]);
  const banners = useMemo(
    () => MARKETING.banners.map((name) => ({ uri: marketingUri(name), key: name })),
    []
  );

  const [idx, setIdx] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / W);
    if (i !== idx && i >= 0 && i < banners.length) setIdx(i);
  }

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={W}
        snapToAlignment="center"
        contentContainerStyle={styles.scrollContent}
      >
        {banners.map((b) => (
          <View key={b.key} style={[styles.slide, { width: W, height: slideHeight }]}>
            <Image source={b} style={[styles.heroImg, { height: slideHeight }]} resizeMode="cover" />
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {banners.map((b, i) => (
          <View key={b.key} style={[styles.dot, i === idx && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  scrollContent: {},
  slide: {
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 0,
    backgroundColor: '#f0f0f0',
  },
  heroImg: { width: '100%', borderRadius: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ccc' },
  dotActive: { backgroundColor: colors.accent, width: 14 },
});
