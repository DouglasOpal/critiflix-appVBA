import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { colors } from '../../theme/tokens';
import Logo, { BrandPattern } from '../../components/Logo';
import { Button, Card } from '../../components/ui';
import { Icons } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

export default function SignIn({ navigation, route }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(route?.params?.verified ? 'create' : 'signin'); // 'signin' | 'create'
  const [role, setRole] = useState('critic');     // create: 'critic' | 'creator'
  const [name, setName] = useState('');
  const [email, setEmail] = useState(route?.params?.verified?.channel === 'email' ? route.params.verified.destination : '');
  const [password, setPassword] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [busy, setBusy] = useState(false);
  const creating = mode === 'create';

  const submit = async () => {
    try {
      setBusy(true);
      if (!creating) {
        await login(email.trim(), password);
      } else if (role === 'creator') {
        if (!whatsapp || whatsapp.replace(/[^0-9]/g, '').length < 7) throw new Error('Enter a valid WhatsApp number');
        navigation.navigate('RegisterStudio', { email: email.trim(), password, name, whatsapp: whatsapp.trim() });
      } else {
        if (!name || !email || password.length < 8) throw new Error('Name, email and an 8+ character password are required');
        if (!whatsapp || whatsapp.replace(/[^0-9]/g, '').length < 7) throw new Error('Enter a valid WhatsApp number');
        // confirm the email before the account is created
        const res = await api.otpRequest('email', email.trim());
        navigation.navigate('ConfirmAccount', {
          pending: { role: 'critic', name, email: email.trim(), password, whatsapp: whatsapp.trim() },
          channel: 'email', destination: email.trim(), devCode: res.devCode,
        });
      }
    } catch (e) { Alert.alert(creating ? 'Could not create account' : 'Sign in failed', e.message); }
    finally { setBusy(false); }
  };

  const forgot = async () => {
    if (!email) return Alert.alert('Reset password', 'Enter your email above first.');
    try {
      const res = await api.forgotPassword(email.trim());
      Alert.alert('Check your email', res.devToken ? `Dev reset token:\n${res.devToken}` : 'If that email exists, a reset link is on its way.');
    } catch (e) { Alert.alert('Error', e.message); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
      <View style={styles.hero}>
        <BrandPattern />
        <View style={styles.glow} />
        <View style={styles.center}>
          <Logo size={70} />
          <View style={{ alignItems: 'center', marginTop: 14 }}>
            <Text style={styles.brand}>CRITIFLIX</Text>
            <Text style={styles.tagline}>Watch films. Review them. Earn points.</Text>
          </View>
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.toggle}>
          {['signin', 'create'].map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} style={[styles.tab, mode === m && styles.tabOn]}>
              <Text style={[styles.tabText, mode === m && { color: '#fff' }]}>{m === 'signin' ? 'Sign in' : 'Create account'}</Text>
            </Pressable>
          ))}
        </View>

        {creating && (
          <View style={styles.roleRow}>
            {['critic', 'creator'].map((rr) => (
              <Pressable key={rr} onPress={() => setRole(rr)} style={[styles.role, role === rr && styles.roleOn]}>
                <Text style={[styles.roleText, role === rr && { color: colors.red }]}>{rr === 'critic' ? 'As a Critic' : 'As a Creator'}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {creating && role === 'critic' && (
          <Card style={styles.field}><TextInput placeholder="Full name" placeholderTextColor={colors.mist2} style={styles.input} value={name} onChangeText={setName} /></Card>
        )}
        <Card style={styles.field}><TextInput placeholder="Email address" placeholderTextColor={colors.mist2} style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} /></Card>
        {creating && (
          <Card style={styles.field}><TextInput placeholder="WhatsApp number (e.g. +234…)" placeholderTextColor={colors.mist2} style={styles.input} value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" autoCapitalize="none" /></Card>
        )}
        {!(creating && role === 'creator') && (
          <Card style={styles.field}><TextInput placeholder="Password" placeholderTextColor={colors.mist2} style={styles.input} value={password} onChangeText={setPassword} secureTextEntry /></Card>
        )}
        {creating && role === 'creator' && (
          <Text style={styles.hint}>Next: add your channel link and studio details.</Text>
        )}

        <Button
          title={busy ? 'Please wait…' : creating ? (role === 'creator' ? 'Continue to studio setup' : 'Create account') : 'Sign in'}
          onPress={submit}
          disabled={busy}
          style={{ marginTop: 4 }}
        />

        {!creating && (<Pressable onPress={forgot}><Text style={styles.link}>Forgot password?</Text></Pressable>)}
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, backgroundColor: colors.navy, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden', minHeight: 230 },
  glow: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: colors.red, opacity: 0.22, top: -50, right: -40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  brand: { color: '#fff', fontWeight: '800', fontSize: 28, letterSpacing: 1.5 },
  tagline: { color: 'rgba(255,255,255,0.7)', fontSize: 12.5, marginTop: 7, textAlign: 'center' },
  sheet: { padding: 22, paddingBottom: 30, backgroundColor: colors.paper },
  toggle: { flexDirection: 'row', backgroundColor: colors.paper2, borderRadius: 12, padding: 4, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9 },
  tabOn: { backgroundColor: colors.navy },
  tabText: { fontWeight: '700', fontSize: 13, color: colors.mist },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  role: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10, borderWidth: 1.5, borderColor: colors.line },
  roleOn: { borderColor: colors.red, backgroundColor: colors.redSoft },
  roleText: { fontWeight: '700', fontSize: 12.5, color: colors.mist },
  field: { paddingHorizontal: 14, paddingVertical: 2, marginBottom: 11 },
  input: { fontSize: 14, color: colors.navyInk, fontWeight: '600', paddingVertical: 13 },
  hint: { fontSize: 11.5, color: colors.mist2, marginBottom: 12, marginTop: -2 },
  link: { textAlign: 'center', color: colors.red, fontSize: 12.5, fontWeight: '600', marginTop: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  line: { flex: 1, height: 1, backgroundColor: colors.line },
  or: { fontSize: 10.5, color: colors.mist2 },
});
