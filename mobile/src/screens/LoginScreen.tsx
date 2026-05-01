import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MARKETING, marketingUri } from '../constants/marketingAssets';
import { ScreenLayout } from '../components/ScreenLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      if (user.role === 'admin') {
        toast.show({ type: 'info', message: 'Admin dashboard is on the website.' });
      }
      navigation.replace('Home');
    } catch (e) {
      toast.show({ type: 'error', message: e instanceof Error ? e.message : 'Login failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenLayout navigation={navigation} breadcrumb="Home / Login">
      <View style={styles.banner}>
        <Image
          source={{ uri: marketingUri(MARKETING.loginBanner) }}
          style={styles.bannerImg}
          resizeMode="cover"
          accessibilityLabel="TimTom"
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.h1}>Login to your account</Text>
        <Text style={styles.lbl}>Email or Mobile Number</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" placeholder="Enter email or mobile" />
        <Text style={styles.lbl}>Password</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" />
        <TouchableOpacity style={styles.loginBtn} disabled={loading} onPress={submit}>
          <Text style={styles.loginBtnTxt}>{loading ? 'Please wait...' : 'LOGIN'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.link}>Create an account</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.linkMuted}>
            Forgot your password? <Text style={styles.danger}>Reset here</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#ffefef',
  },
  bannerImg: { width: '100%', height: 160 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 20,
    backgroundColor: '#fff',
  },
  h1: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  lbl: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 12,
    marginBottom: 14,
    fontSize: 16,
  },
  loginBtn: {
    backgroundColor: colors.loginPink,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  loginBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  link: { color: colors.primary, fontWeight: '600', marginBottom: 8 },
  linkMuted: { color: colors.muted, fontSize: 13, marginTop: 4 },
  danger: { color: colors.danger, fontWeight: '700' },
});
