import type { NavigationProp } from '@react-navigation/native';
import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';

export function AppFooter({ navigation }: { navigation: NavigationProp<RootStackParamList> }) {
  return (
    <View style={styles.footer}>
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.heading}>Online Shopping</Text>
          <TouchableOpacity onPress={() => navigation.navigate('NavCategory', { categorySlug: 'baby', subSlug: 'all' })}>
            <Text style={styles.link}>Baby</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('NavCategory', { categorySlug: 'boy', subSlug: 'all' })}>
            <Text style={styles.link}>Boy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('NavCategory', { categorySlug: 'girl', subSlug: 'all' })}>
            <Text style={styles.link}>Girl</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('NavCategory', { categorySlug: 'accessories', subSlug: 'all' })}
          >
            <Text style={styles.link}>Accessories</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('NavCategory', { categorySlug: 'gift-collection', subSlug: 'all' })}
          >
            <Text style={styles.link}>Gifts Collection</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.col}>
          <Text style={styles.heading}>Customer Policies</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Contact')}>
            <Text style={styles.link}>Contact Us</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('WebPage', { path: '/faq', title: 'FAQ' })}>
            <Text style={styles.link}>FAQ</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('WebPage', { path: '/terms-of-use', title: 'Terms Of Use' })}>
            <Text style={styles.link}>Terms Of Use</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('WebPage', { path: '/privacy-policy', title: 'Privacy policy' })}
          >
            <Text style={styles.link}>Privacy policy</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Experience App on Mobile</Text>
        <Text style={styles.smallMuted}>You are using the TimTom app.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Keep in touch</Text>
        <TouchableOpacity
          onPress={() =>
            Linking.openURL('https://www.instagram.com/timtomcollection?igsh=Y3l6ZWFmdzkyYWRp')
          }
        >
          <Text style={styles.link}>Instagram</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.trust}>
        <Text style={styles.trustTitle}>100% ORIGINAL</Text>
        <Text style={styles.smallMuted}>guarantee for all products</Text>
        <Text style={[styles.trustTitle, { marginTop: 12 }]}>Return within 7 days</Text>
        <Text style={styles.smallMuted}>of receiving your order</Text>
      </View>

      <View style={styles.hr} />
      <View style={styles.bottomRow}>
        <Text style={styles.smallMuted}>© {new Date().getFullYear()} TimTom. All rights reserved.</Text>
        <Text style={styles.smallMuted}>Made with ♥ — TimTom</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexShrink: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.footerBg,
    padding: 20,
    paddingBottom: 28,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  col: { flex: 1, minWidth: 140 },
  heading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  link: { color: colors.muted, marginBottom: 8, fontSize: 14 },
  section: { marginTop: 20 },
  smallMuted: { color: colors.muted, fontSize: 12, marginTop: 4 },
  trust: { marginTop: 20 },
  trustTitle: { fontWeight: '800', fontSize: 14 },
  hr: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  bottomRow: { gap: 8 },
});
