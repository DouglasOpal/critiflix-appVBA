import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Image, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { colors } from '../../theme/tokens';
import { Screen, TopBand, Pad, Icons } from '../../components/Screen';
import { Card, Button, Eyebrow } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

function Field({ label, value, onChangeText, placeholder, leftYT, secureTextEntry, keyboardType, autoCapitalize }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Eyebrow tone="mist">{label}</Eyebrow>
      <Card style={{ marginTop: 7, paddingHorizontal: 14, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {leftYT ? Icons.youtube(15) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mist2}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={{ flex: 1, fontSize: 13.5, color: colors.navyInk, fontWeight: '600', paddingVertical: 10 }}
        />
      </Card>
    </View>
  );
}

export default function RegisterStudio({ navigation, route }) {
  const { registerStudio } = useAuth();
  const prefill = route?.params || {};
  const [name, setName] = useState(prefill.name || '');
  const [email, setEmail] = useState(prefill.email || '');
  const [password, setPassword] = useState(prefill.password || '');
  const [channelUrl, setChannelUrl] = useState('');
  const [otherUrl, setOtherUrl] = useState('');
  const [country, setCountry] = useState('Nigeria');
  const [genre, setGenre] = useState('Thriller');
  const [logoUri, setLogoUri] = useState(null);   // resized locally; uploaded after the account exists
  const [busyLogo, setBusyLogo] = useState(false);

  // Pick + crop a square logo. We can't upload yet (no account/token), so we
  // resize it locally and hand the file to ConfirmAccount to upload post-signup.
  const pickLogo = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permission needed', 'Allow library access to add a logo.');
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 1 });
      if (res.canceled || !res.assets?.length) return;
      const src = res.assets[0].uri;
      let info = null;
      try { info = await FileSystem.getInfoAsync(src, { size: true }); } catch {}
      if (info && info.exists === false) {
        return Alert.alert('Can’t use that image', 'That file is stored in iCloud and isn’t downloaded to this device yet. Open it once in the Photos app, then try again.');
      }
      setBusyLogo(true);
      const sized = await ImageManipulator.manipulateAsync(src, [{ resize: { width: 320 } }], { compress: 0.85, format: ImageManipulator.SaveFormat.PNG });
      setLogoUri(sized.uri);
    } catch (e) {
      Alert.alert('Could not add logo', e.message);
    } finally {
      setBusyLogo(false);
    }
  };

  const submit = async () => {
    if (!name || !channelUrl) return Alert.alert('Missing info', 'Studio name and channel link are required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Alert.alert('Missing info', 'A valid email is required.');
    if (password.length < 8) return Alert.alert('Weak password', 'Use at least 8 characters.');
    try {
      // confirm the email before the studio account is created
      const res = await api.otpRequest('email', email.trim());
      navigation.navigate('ConfirmAccount', {
        pending: { role: 'creator', name, email: email.trim(), password, whatsapp: prefill.whatsapp, channelUrl, otherUrl, country, genre, logoUri },
        channel: 'email', destination: email.trim(), devCode: res.devCode,
      });
    } catch (e) { Alert.alert('Could not send code', e.message); }
  };

  return (
    <Screen>
      <TopBand title="Set up studio" subtitle="Step 1 of 2" onBack={() => navigation.goBack()} />
      <Pad style={{ marginTop: 16 }}>
        <Card style={styles.logoBox}>
          <View style={styles.logoIcon}>
            <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M3 16l5-5 4 4 4-4 5 5M3 6h18v14H3z" stroke={colors.navy} strokeWidth="1.7" fill="none" /></Svg>
          </View>
          <Text style={{ fontWeight: '700', fontSize: 14, color: colors.navyInk }}>Upload production logo</Text>
          <Text style={{ fontSize: 11, color: colors.mist2, marginTop: 3 }}>PNG / SVG · square · shown on every title</Text>
        </Card>

        <View style={{ alignItems: 'center', marginBottom: 18 }}>
          <Pressable onPress={pickLogo} disabled={busyLogo} style={styles.logoPick}>
            {busyLogo ? <ActivityIndicator color={colors.red} />
              : logoUri ? <Image source={{ uri: logoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              : Icons.plus(colors.mist2, 22)}
            <View style={styles.logoBadge}><Text style={styles.logoBadgeText}>{logoUri ? 'EDIT' : 'LOGO'}</Text></View>
          </Pressable>
          <Text style={{ fontSize: 11.5, color: colors.mist2, marginTop: 8 }}>{logoUri ? 'Channel logo added' : 'Add your channel logo (optional)'}</Text>
        </View>

        <Field label="Studio name" value={name} onChangeText={setName} placeholder="e.g. Kọ́lá Films" />
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="studio@email.com" keyboardType="email-address" autoCapitalize="none" />
        <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry />
        <Field label="Channel link" value={channelUrl} onChangeText={setChannelUrl} placeholder="youtube.com/@yourchannel" leftYT autoCapitalize="none" />
        <Field label="Other streaming link" value={otherUrl} onChangeText={setOtherUrl} placeholder="vimeo.com/yourchannel (optional)" autoCapitalize="none" />
        <Field label="Country" value={country} onChangeText={setCountry} placeholder="Country" />
        <Field label="Primary genre" value={genre} onChangeText={setGenre} placeholder="Genre" />

        <Button title="Continue to plans" onPress={submit} style={{ marginTop: 4 }} />
      </Pad>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logoPick: { width: 88, height: 88, borderRadius: 22, backgroundColor: colors.paper2, borderWidth: 1.5, borderColor: colors.line, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(11,26,51,0.72)', paddingVertical: 3, alignItems: 'center' },
  logoBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  logoBox: { padding: 18, alignItems: 'center', marginBottom: 16, borderStyle: 'dashed', borderColor: '#C7D2E6' },
  logoIcon: { width: 60, height: 60, borderRadius: 16, backgroundColor: colors.paper2, alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
});
