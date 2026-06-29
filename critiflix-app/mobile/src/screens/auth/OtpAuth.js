import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { colors } from '../../theme/tokens';
import Logo from '../../components/Logo';
import { Button, Card } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

// Passwordless / verification flow: request a code by email or phone, then verify.
export default function OtpAuth({ navigation }) {
  const { loginWithSession } = useAuth();
  const [channel, setChannel] = useState('email');     // 'email' | 'phone'
  const [destination, setDestination] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState('request');        // 'request' | 'verify'
  const [busy, setBusy] = useState(false);
  const [devCode, setDevCode] = useState(null);

  const request = async () => {
    if (!destination.trim()) return Alert.alert('Missing', `Enter your ${channel === 'email' ? 'email' : 'phone number'}.`);
    try {
      setBusy(true);
      const res = await api.otpRequest(channel, destination.trim());
      setStage('verify');
      setDevCode(res.devCode || null); // dev convenience when no SMS/email provider is set
    } catch (e) { Alert.alert('Could not send code', e.message); }
    finally { setBusy(false); }
  };

  const verify = async () => {
    if (code.trim().length < 6) return Alert.alert('Code', 'Enter the 6-digit code.');
    try {
      setBusy(true);
      const res = await api.otpVerify(channel, destination.trim(), code.trim());
      if (res.user) {
        await loginWithSession(res); // existing account -> signed in
      } else {
        // verified but no account yet -> go create one with this destination prefilled
        Alert.alert('Verified', 'Now create your account to finish.');
        navigation.navigate('SignIn', { verified: { channel, destination: destination.trim() } });
      }
    } catch (e) { Alert.alert('Verification failed', e.message); }
    finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
      <View style={styles.hero}>
        <Logo size={58} />
        <Text style={styles.brand}>Sign in with a code</Text>
        <Text style={styles.sub}>We'll send a one-time code to verify it's you.</Text>
      </View>

      <View style={styles.sheet}>
        {stage === 'request' ? (
          <>
            <View style={styles.toggle}>
              {['email', 'phone'].map((c) => (
                <Pressable key={c} onPress={() => setChannel(c)} style={[styles.tab, channel === c && styles.tabOn]}>
                  <Text style={[styles.tabText, channel === c && { color: '#fff' }]}>{c === 'email' ? 'Email' : 'Phone'}</Text>
                </Pressable>
              ))}
            </View>
            <Card style={styles.field}>
              <TextInput
                placeholder={channel === 'email' ? 'you@email.com' : '+234 801 234 5678'}
                placeholderTextColor={colors.mist2} style={styles.input}
                value={destination} onChangeText={setDestination}
                keyboardType={channel === 'email' ? 'email-address' : 'phone-pad'}
                autoCapitalize="none" autoCorrect={false}
              />
            </Card>
            <Button title={busy ? 'Sending…' : 'Send code'} onPress={request} disabled={busy} style={{ marginTop: 4 }} />
          </>
        ) : (
          <>
            <Text style={styles.hint}>Enter the 6-digit code sent to {destination}.</Text>
            {devCode ? <Text style={styles.dev}>Dev code: {devCode}</Text> : null}
            <Card style={styles.field}>
              <TextInput placeholder="••••••" placeholderTextColor={colors.mist2}
                style={[styles.input, { letterSpacing: 8, textAlign: 'center', fontSize: 20 }]}
                value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
            </Card>
            <Button title={busy ? 'Verifying…' : 'Verify & continue'} onPress={verify} disabled={busy} style={{ marginTop: 4 }} />
            <Pressable onPress={() => setStage('request')}><Text style={styles.link}>Use a different email/phone</Text></Pressable>
          </>
        )}
        <Pressable onPress={() => navigation.goBack()}><Text style={styles.link}>Back to password sign-in</Text></Pressable>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  brand: { color: '#fff', fontWeight: '800', fontSize: 20, marginTop: 14 },
  sub: { color: 'rgba(255,255,255,0.7)', fontSize: 12.5, marginTop: 6, textAlign: 'center', paddingHorizontal: 30 },
  sheet: { padding: 22, paddingTop: 26 },
  toggle: { flexDirection: 'row', backgroundColor: colors.paper2, borderRadius: 12, padding: 4, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9 },
  tabOn: { backgroundColor: colors.navy },
  tabText: { fontWeight: '700', fontSize: 13, color: colors.mist },
  field: { paddingHorizontal: 14, paddingVertical: 2, marginBottom: 11 },
  input: { fontSize: 14, color: colors.navyInk, fontWeight: '600', paddingVertical: 13 },
  hint: { fontSize: 12.5, color: colors.mist, marginBottom: 10 },
  dev: { fontSize: 12, color: colors.red, fontWeight: '700', marginBottom: 10 },
  link: { textAlign: 'center', color: colors.red, fontSize: 12.5, fontWeight: '600', marginTop: 14 },
});
