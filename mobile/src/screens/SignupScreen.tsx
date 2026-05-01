import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MARKETING, marketingUri } from '../constants/marketingAssets';
import { signupRequest, signupVerifyOtp } from '../api/shop';
import { ScreenLayout } from '../components/ScreenLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

export function SignupScreen({ navigation }: Props) {
  const { applySessionFromLoginResponse } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [loading, setLoading] = useState(false);

  async function submitDetails() {
    setLoading(true);
    try {
      await signupRequest(form);
      setStep('otp');
    } catch (e) {
      toast.show({ type: 'error', message: e instanceof Error ? e.message : 'Signup failed' });
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setLoading(true);
    try {
      const data = await signupVerifyOtp(form.email.trim(), otp.trim());
      await applySessionFromLoginResponse(data);
      navigation.replace('Home');
    } catch (e) {
      toast.show({ type: 'error', message: e instanceof Error ? e.message : 'OTP verification failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenLayout navigation={navigation} breadcrumb="Home / Sign up">
      <View style={styles.banner}>
        <Image
          source={{ uri: marketingUri(MARKETING.loginBanner) }}
          style={styles.bannerImg}
          resizeMode="cover"
          accessibilityLabel="TimTom"
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.h1}>{step === 'details' ? 'Create an account' : 'Verify OTP'}</Text>
        {step === 'details' ? (
          <>
            <Text style={styles.lbl}>Name</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} placeholder="Full name" />
            <Text style={styles.lbl}>Email</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={(t) => setForm({ ...form, email: t })}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
            />
            <Text style={styles.lbl}>Password</Text>
            <TextInput
              style={styles.input}
              value={form.password}
              onChangeText={(t) => setForm({ ...form, password: t })}
              secureTextEntry
              placeholder="Choose a password"
            />
            <TouchableOpacity style={styles.loginBtn} disabled={loading} onPress={submitDetails}>
              <Text style={styles.loginBtnTxt}>{loading ? 'Creating...' : 'CONTINUE'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.lbl}>Enter OTP</Text>
            <TextInput style={styles.input} value={otp} onChangeText={setOtp} keyboardType="number-pad" placeholder="6-digit code" />
            <TouchableOpacity style={styles.loginBtn} disabled={loading} onPress={verifyOtp}>
              <Text style={styles.loginBtnTxt}>{loading ? 'Verifying...' : 'VERIFY & SIGN IN'}</Text>
            </TouchableOpacity>
            <Text style={styles.hint}>Didn&apos;t receive the code? Go back and re-submit your details.</Text>
          </>
        )}
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Already have an account? Login</Text>
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
  link: { color: colors.primary, fontWeight: '600', marginTop: 8 },
  hint: { fontSize: 12, color: colors.muted, marginTop: 8 },
});
