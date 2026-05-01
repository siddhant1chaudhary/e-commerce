import type { NavigationProp } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MARKETING, marketingUri } from '../constants/marketingAssets';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { navHeader } from '../data/navHeader';
import { parseShopPath } from '../navigation/navUtils';
import type { RootStackParamList } from '../navigation/types';

type Props = { navigation: NavigationProp<RootStackParamList>; breadcrumb?: string };

export function AppHeader({ navigation, breadcrumb }: Props) {
  const { user, cartCount, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [search, setSearch] = useState('');

  function goHref(href: string) {
    setMenuOpen(false);
    const parsed = parseShopPath(href);
    if (parsed) {
      navigation.navigate('NavCategory', {
        categorySlug: parsed.categorySlug,
        subSlug: parsed.subSlug,
      });
      return;
    }
    navigation.navigate('Home');
  }

  function goCategoryAll(subTitle: string) {
    setMenuOpen(false);
    navigation.navigate('NavCategory', { categorySlug: subTitle, subSlug: 'all' });
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.brandRow} onPress={() => navigation.navigate('Home')}>
          <Image
            source={{ uri: marketingUri(MARKETING.logo) }}
            style={styles.logoImg}
            resizeMode="cover"
            accessibilityLabel="TimTom logo"
          />
          <View style={styles.brandText}>
            <Text style={styles.brandTim}>Tim</Text>
            <Text style={styles.brandTom}>tom</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.iconBtn}>
          <Text style={styles.iconBtnText}>☰</Text>
        </TouchableOpacity>

        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for products, brands and more"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            editable={false}
          />
        </View>

        <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('Cart')}>
          <Text style={styles.cartGlyph}>🛒</Text>
          <Text style={styles.cartLabel}>Cart</Text>
          {cartCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeTxt}>{cartCount > 99 ? '99+' : cartCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        {!user ? (
          <View style={styles.authBtns}>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.outlineBtnTxt}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fillBtn} onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.fillBtnTxt}>Sign up</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.userBtn} onPress={() => setUserOpen(true)}>
            <Text style={styles.userBtnTxt} numberOfLines={1}>
              Hi, {user.name || 'User'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {breadcrumb ? (
        <Text style={styles.crumb} numberOfLines={2}>
          {breadcrumb}
        </Text>
      ) : null}

      <Modal visible={menuOpen} animationType="slide" transparent>
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuOpen(false)} />
        <View style={styles.menuSheet}>
          <Text style={styles.menuTitle}>Shop</Text>
          {navHeader.map((cat) => (
            <View key={cat.id} style={styles.menuBlock}>
              <TouchableOpacity onPress={() => goCategoryAll(cat.subTitle)}>
                <Text style={styles.menuCat}>{cat.title}</Text>
              </TouchableOpacity>
              {(cat.items || []).map((it) => (
                <TouchableOpacity key={it.href} style={styles.menuItem} onPress={() => goHref(it.href)}>
                  <Text style={styles.menuItemTxt}>{it.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <TouchableOpacity style={styles.menuClose} onPress={() => setMenuOpen(false)}>
            <Text style={styles.menuCloseTxt}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={userOpen} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setUserOpen(false)} />
        <View style={styles.userSheet}>
          {user?.role === 'admin' ? (
            <Text style={styles.adminNote}>Admin tools are available on the website.</Text>
          ) : null}
          <TouchableOpacity
            style={styles.userSheetItem}
            onPress={() => {
              setUserOpen(false);
              navigation.navigate('Profile');
            }}
          >
            <Text>My Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.userSheetItem}
            onPress={() => {
              setUserOpen(false);
              navigation.navigate('Orders');
            }}
          >
            <Text>My Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.userSheetDanger}
            onPress={async () => {
              setUserOpen(false);
              await logout();
              navigation.navigate('Home');
            }}
          >
            <Text style={styles.userSheetDangerTxt}>Logout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.userSheetItem} onPress={() => setUserOpen(false)}>
            <Text>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.lightBg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logoImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  brandText: { flexDirection: 'row', alignItems: 'baseline' },
  brandTim: { fontSize: 20, fontWeight: '800', color: colors.primary },
  brandTom: { fontSize: 20, fontWeight: '800', color: colors.accent },
  iconBtn: { padding: 6 },
  iconBtnText: { fontSize: 20, color: '#333' },
  searchWrap: {
    flex: 1,
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
  },
  searchIcon: { color: colors.muted, marginRight: 4 },
  searchInput: { flex: 1, paddingVertical: 6, fontSize: 12, color: colors.text },
  cartBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  cartGlyph: { fontSize: 16 },
  cartLabel: { marginLeft: 4, color: colors.accent, fontSize: 13 },
  badge: {
    marginLeft: 6,
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 18,
    paddingHorizontal: 5,
    alignItems: 'center',
  },
  badgeTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
  authBtns: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  outlineBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  outlineBtnTxt: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  fillBtn: {
    backgroundColor: colors.accent,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  fillBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  userBtn: { maxWidth: 100, paddingHorizontal: 4 },
  userBtnTxt: { fontSize: 13, fontWeight: '600' },
  crumb: { fontSize: 12, color: colors.muted, marginTop: 4 },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  menuSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 16,
  },
  menuTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  menuBlock: { marginBottom: 12 },
  menuCat: { fontSize: 15, fontWeight: '700', color: colors.accent, marginBottom: 4 },
  menuItem: { paddingVertical: 6, paddingLeft: 8 },
  menuItemTxt: { fontSize: 14, color: colors.text },
  menuClose: { marginTop: 8, alignItems: 'center', padding: 12 },
  menuCloseTxt: { color: colors.primary, fontWeight: '700' },
  userSheet: {
    marginHorizontal: 40,
    marginTop: '40%',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 8,
    elevation: 4,
  },
  userSheetItem: { paddingVertical: 14, paddingHorizontal: 16 },
  userSheetDanger: { paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  userSheetDangerTxt: { color: colors.danger, fontWeight: '700' },
  adminNote: { padding: 12, fontSize: 12, color: colors.muted },
});
