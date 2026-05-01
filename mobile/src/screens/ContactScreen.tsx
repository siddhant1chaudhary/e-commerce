import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { postContact } from '../api/shop';
import { ScreenLayout } from '../components/ScreenLayout';
import { useToast } from '../context/ToastContext';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Contact'>;

export function ContactScreen({ navigation }: Props) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await postContact({ name: name.trim(), email: email.trim(), message: message.trim() });
      toast.show({ type: 'success', message: 'Message sent. We will get back to you soon.' });
      setName('');
      setEmail('');
      setMessage('');
    } catch (e) {
      toast.show({ type: 'error', message: e instanceof Error ? e.message : 'Could not send message' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenLayout navigation={navigation} breadcrumb="Home / Contact Us">
      <Text style={styles.h1}>Contact Us</Text>
      <Text style={styles.lbl}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={200} placeholder="Your Name" />
      <Text style={styles.lbl}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Your Email"
      />
      <Text style={styles.lbl}>Message</Text>
      <TextInput
        style={[styles.input, { minHeight: 120 }]}
        value={message}
        onChangeText={setMessage}
        multiline
        placeholder="Your Message"
        maxLength={10000}
      />
      <TouchableOpacity style={styles.btn} disabled={submitting} onPress={submit}>
        <Text style={styles.btnTxt}>{submitting ? 'Sending...' : 'Send message'}</Text>
      </TouchableOpacity>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  lbl: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    fontSize: 16,
  },
  btn: { backgroundColor: colors.accent, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
