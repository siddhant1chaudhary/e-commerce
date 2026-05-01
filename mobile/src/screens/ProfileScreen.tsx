import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { fetchAddresses, fetchProfile, postAddress, putProfile, type Address } from '../api/shop';
import { ScreenLayout } from '../components/ScreenLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export function ProfileScreen({ navigation }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [newAddr, setNewAddr] = useState({ name: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const p = await fetchProfile();
      setName(p.name || '');
      setEmail(p.email || '');
      const a = await fetchAddresses();
      setAddresses(a.addresses || []);
    } catch {
      toast.show({ type: 'error', message: 'Could not load profile' });
    }
  }, [user, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveProfile() {
    setSaving(true);
    try {
      await putProfile({ name, email });
      toast.show({ type: 'success', message: 'Profile saved' });
    } catch (e) {
      toast.show({ type: 'error', message: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }

  async function addAddress() {
    if (!newAddr.name.trim() || !newAddr.phone.trim() || !newAddr.address.trim()) {
      toast.show({ type: 'error', message: 'Please fill in all address fields' });
      return;
    }
    setSaving(true);
    try {
      await postAddress({
        name: newAddr.name.trim(),
        phone: newAddr.phone.trim(),
        address: newAddr.address.trim(),
      });
      setNewAddr({ name: '', phone: '', address: '' });
      const a = await fetchAddresses();
      setAddresses(a.addresses || []);
      toast.show({ type: 'success', message: 'Address added' });
    } catch (e) {
      toast.show({ type: 'error', message: e instanceof Error ? e.message : 'Failed to add address' });
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <ScreenLayout navigation={navigation}>
        <Text style={styles.warn}>Please login to view your profile.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.btnTxt}>Login</Text>
        </TouchableOpacity>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout navigation={navigation} breadcrumb="Home / Profile">
      <Text style={styles.h1}>My Profile</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <Text style={styles.lbl}>Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />
        <Text style={styles.lbl}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TouchableOpacity style={styles.btn} onPress={saveProfile} disabled={saving}>
          <Text style={styles.btnTxt}>{saving ? 'Saving...' : 'Save profile'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Saved addresses</Text>
        {addresses.map((a) => (
          <View key={a.id} style={styles.addr}>
            <Text style={styles.addrName}>{a.name}</Text>
            <Text style={styles.muted}>{a.phone}</Text>
            <Text style={styles.muted}>{a.address}</Text>
            {a.isDefault ? <Text style={styles.def}>Default</Text> : null}
          </View>
        ))}
        <Text style={styles.subTitle}>Add address</Text>
        <TextInput style={styles.input} placeholder="Name" value={newAddr.name} onChangeText={(t) => setNewAddr({ ...newAddr, name: t })} />
        <TextInput style={styles.input} placeholder="Phone" value={newAddr.phone} onChangeText={(t) => setNewAddr({ ...newAddr, phone: t })} keyboardType="phone-pad" />
        <TextInput
          style={[styles.input, { minHeight: 72 }]}
          placeholder="Address"
          multiline
          value={newAddr.address}
          onChangeText={(t) => setNewAddr({ ...newAddr, address: t })}
        />
        <TouchableOpacity style={styles.outline} onPress={addAddress} disabled={saving}>
          <Text style={styles.outlineTxt}>Add address</Text>
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  warn: { marginBottom: 12, color: colors.muted },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  lbl: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    fontSize: 15,
  },
  btn: { backgroundColor: colors.accent, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '800' },
  outline: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  outlineTxt: { color: colors.primary, fontWeight: '700' },
  addr: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingVertical: 10,
  },
  addrName: { fontWeight: '700' },
  muted: { color: colors.muted, fontSize: 13 },
  def: { marginTop: 4, fontSize: 12, color: colors.accent, fontWeight: '700' },
  subTitle: { fontWeight: '700', marginTop: 8, marginBottom: 6 },
});
