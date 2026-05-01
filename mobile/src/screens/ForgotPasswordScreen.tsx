import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MARKETING, marketingUri } from '../constants/marketingAssets';
import { forgotPasswordRequest, forgotPasswordVerify } from '../api/shop';
import { ScreenLayout } from '../components/ScreenLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const { applySessionFromLoginResponse } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);

  async function requestOtp() {
    setLoading(true);
    try {
      await forgotPasswordRequest(email.trim());
      setStep('otp');
    } catch (e) {
      toast.show({ type: 'error', message: e instanceof Error ? e.message : 'Could not request OTP' });
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    setLoading(true);
    try {
      const data = await forgotPasswordVerify(email.trim(), otp.trim(), newPassword);
      await applySessionFromLoginResponse(data);
      navigation.replace('Home');
    } catch (e) {
      toast.show({ type: 'error', message: e instanceof Error ? e.message : 'OTP verification failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenLayout navigation={navigation} breadcrumb="Home / Forgot password">
      <View style={styles.banner}>
        <Image
          source={{ uri: marketingUri(MARKETING.loginBanner) }}
          style={styles.bannerImg}
          resizeMode="cover"
          accessibilityLabel="TimTom"
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.h1}>Reset password</Text>
        {step === 'email' ? (
          <>
            <Text style={styles.lbl}>Email</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <TouchableOpacity style={styles.btn} disabled={loading} onPress={requestOtp}>
              <Text style={styles.btnTxt}>{loading ? 'Please wait...' : 'Send OTP'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.lbl}>OTP</Text>
            <TextInput style={styles.input} value={otp} onChangeText={setOtp} keyboardType="number-pad" />
            <Text style={styles.lbl}>New password</Text>
            <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
            <TouchableOpacity style={styles.btn} disabled={loading} onPress={verify}>
              <Text style={styles.btnTxt}>{loading ? 'Please wait...' : 'Reset & sign in'}</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Back to login</Text>
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
  btn: {
    backgroundColor: colors.loginPink,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  link: { color: colors.primary, fontWeight: '600' },
});
