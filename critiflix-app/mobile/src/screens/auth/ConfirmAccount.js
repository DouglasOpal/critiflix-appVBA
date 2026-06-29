import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { colors } from '../../theme/tokens';
import Logo from '../../components/Logo';
import { Button, Card } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

// Final step of sign-up: confirm the email/phone with the 6-digit code, which the
// server re-verifies as it creates the account. Works for critics and creators.
export default function ConfirmAccount({ route, navigation }) {
  const { register, refresh } = useAuth();
  const { pending, channel = 'email', destination, devCode: initialDev } = route.params || {};
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [devCode, setDevCode] = useState(initialDev || null);
  const [seconds, setSeconds] = useState(30);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const resend = async () => {
    try {
      const res = await api.otpRequest(channel, destination);
      setDevCode(res.devCode || null);
      setSeconds(30);
      Alert.alert('Code sent', `A new code is on its way to ${destination}.`);
    } catch (e) { Alert.alert('Could not resend', e.message); }
  };

  const confirm = async () => {
    if (code.trim().length < 6) return Alert.alert('Code', 'Enter the 6-digit code.');
    try {
      setBusy(true);
      await register({ ...pending, channel, code: code.trim() }); // creates the (now-confirmed) account
      // Account exists and we're authenticated — upload the logo picked at signup, if any.
      if (pending.role === 'creator' && pending.logoUri) {
        try {
          const up = await api.uploadImage({ uri: pending.logoUri, name: 'logo.png', type: 'image/png' });
          await api.setLogo(up.url);
          await refresh();
        } catch { /* logo is optional — can be added later in Studio */ }
      }
      if (pending.role === 'creator') navigation.navigate('Plans', { onboarding: true });
      // critics: RootNavigator switches to the app automatically once user is set
    } catch (e) { Alert.alert('Could not confirm', e.message); }
    finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
      <View style={styles.hero}>
        <Logo size={56} />
        <Text style={styles.brand}>Confirm your {channel === 'phone' ? 'number' : 'email'}</Text>
        <Text style={styles.sub}>We sent a 6-digit code to {destination}. Enter it to finish creating your account.</Text>
      </View>

      <View style={styles.sheet}>
        {devCode ? <Text style={styles.dev}>Dev code: {devCode}</Text> : null}
        <Card style={styles.field}>
          <TextInput
            placeholder="••••••" placeholderTextColor={colors.mist2}
            style={[styles.input, { letterSpacing: 8, textAlign: 'center', fontSize: 20 }]}
            value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} autoFocus
          />
        </Card>
        <Button title={busy ? 'Confirming…' : 'Confirm & create account'} onPress={confirm} disabled={busy} style={{ marginTop: 4 }} />

        <Pressable onPress={resend} disabled={seconds > 0}>
          <Text style={[styles.link, seconds > 0 && { color: colors.mist2 }]}>
            {seconds > 0 ? `Resend code in ${seconds}s` : 'Resend code'}
          </Text>
        </Pressable>
        <Pressable onPress={() => navigation.goBack()}><Text style={styles.link}>Use a different {channel === 'phone' ? 'number' : 'email'}</Text></Pressable>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', paddingVertical: 46, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  brand: { color: '#fff', fontWeight: '800', fontSize: 20, marginTop: 14 },
  sub: { color: 'rgba(255,255,255,0.7)', fontSize: 12.5, marginTop: 6, textAlign: 'center', paddingHorizontal: 30, lineHeight: 18 },
  sheet: { padding: 22, paddingTop: 26 },
  field: { paddingHorizontal: 14, paddingVertical: 2, marginBottom: 11 },
  input: { fontSize: 14, color: colors.navyInk, fontWeight: '600', paddingVertical: 13 },
  dev: { fontSize: 12, color: colors.red, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  link: { textAlign: 'center', color: colors.red, fontSize: 12.5, fontWeight: '600', marginTop: 14 },
});
