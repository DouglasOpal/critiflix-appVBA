import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, Image, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { colors } from '../../theme/tokens';
import Logo from '../../components/Logo';
import { Screen, TopBand, Pad, Icons } from '../../components/Screen';
import { Card, Button, Chip, Avatar, Eyebrow } from '../../components/ui';
import { api, mediaUrl } from '../../api';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../../components/NotificationBell';

const PLAN_LABEL = { free: 'Free', curious: 'Curious · ₦7,500', growth: 'Growth · ₦30,000', premium: 'Premium · ₦75,000' };
const normPlan = (p) => (['free','curious','growth','premium'].includes(p) ? p : ({ starter:'free', pro:'curious', studio:'growth' }[p] || 'free'));

function Row({ label, value, onPress, last }) {
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: 13, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: colors.mist2, marginBottom: 2 }}>{label}</Text>
        <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.navyInk }} numberOfLines={1}>{value || '—'}</Text>
      </View>
      {onPress ? <Text style={{ color: colors.mist2, fontSize: 18, marginLeft: 8 }}>›</Text> : null}
    </Pressable>
  );
}

export default function Studio({ navigation }) {
  const { user, logout, refresh } = useAuth();
  const [data, setData] = useState(null);
  const [busyLogo, setBusyLogo] = useState(false);
  const load = useCallback(() => api.studio().then(setData).catch(() => {}), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const plan = normPlan(data?.studio?.plan || user?.plan || 'free');
  const remaining = data?.studio?.campaignRemaining || 0;
  const poolTotal = data?.studio?.campaignPool || 0;
  const exhausted = !!data?.studio?.campaignExhausted;
  const logoUrl = mediaUrl(data?.studio?.logoUrl || user?.logoUrl);

  // Pick + upload the studio/channel logo (square), then save it to the profile.
  const pickLogo = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permission needed', 'Allow library access to upload a logo.');
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
      const up = await api.uploadImage({ uri: sized.uri, name: 'logo.png', type: 'image/png' });
      await api.setLogo(up.url);
      await refresh();
      setData((d) => (d ? { ...d, studio: { ...d.studio, logoUrl: up.url } } : d));
    } catch (e) {
      Alert.alert('Could not upload logo', e.message);
    } finally {
      setBusyLogo(false);
    }
  };

  return (
    <Screen onRefresh={load}>
      <TopBand title="Studio" subtitle="Profile & settings" right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><NotificationBell /><Avatar label={(user?.name || 'K')[0]} color={colors.red} /></View>} />

      <Pad style={{ marginTop: 16 }}>
        <Card style={{ padding: 18, alignItems: 'center', marginBottom: 16 }}>
          <Pressable onPress={pickLogo} style={{ width: 84, height: 84, borderRadius: 22, backgroundColor: colors.paper2, alignItems: 'center', justifyContent: 'center', marginBottom: 12, overflow: 'hidden' }}>
            {busyLogo ? <ActivityIndicator color={colors.red} />
              : logoUrl ? <Image source={{ uri: logoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              : <Logo size={48} />}
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(11,26,51,0.72)', paddingVertical: 3, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{logoUrl ? 'EDIT' : 'ADD LOGO'}</Text>
            </View>
          </Pressable>
          <Text style={{ fontWeight: '800', fontSize: 18, color: colors.navyInk }}>{user?.name || 'Your Studio'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 }}>
            <Chip label={user?.status === 'verified' ? 'Verified' : 'Pending review'} tone={user?.status === 'verified' ? 'green' : 'default'} />
            <Text style={{ fontSize: 11, color: colors.mist2 }}>{user?.country || 'Nigeria'}</Text>
          </View>
          <Button title={busyLogo ? 'Uploading…' : logoUrl ? 'Change channel logo' : 'Upload channel logo'} variant="ghost" onPress={pickLogo} disabled={busyLogo} style={{ marginTop: 14, alignSelf: 'stretch' }} />
        </Card>

        <Eyebrow tone="mist">Campaign package</Eyebrow>
        <Card style={{ padding: 16, marginTop: 8, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View>
              <Text style={{ fontWeight: '800', fontSize: 15, color: colors.navyInk }}>{PLAN_LABEL[plan]}</Text>
              <Text style={{ fontSize: 11, color: colors.mist2, marginTop: 3 }}>
                {plan === 'free' ? 'One-time 3 uploads · funds no points' : 'Consumption-based · depletes as critics earn'}
              </Text>
            </View>
            <Chip label={plan.toUpperCase()} tone={exhausted ? 'navy' : 'red'} />
          </View>
          {plan !== 'free' ? (
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <Text style={{ fontSize: 11.5, color: colors.mist }}>Points remaining</Text>
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: exhausted ? colors.red : colors.navyInk }}>{remaining.toLocaleString()} / {poolTotal.toLocaleString()}</Text>
              </View>
              <View style={{ height: 7, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${poolTotal ? Math.max(3, Math.round(remaining / poolTotal * 100)) : 0}%`, backgroundColor: exhausted ? colors.red : colors.wa }} />
              </View>
              {exhausted ? <Text style={{ fontSize: 11, color: colors.red, fontWeight: '700', marginTop: 7 }}>Campaign exhausted — renew or upgrade to keep rewarding critics.</Text> : null}
            </View>
          ) : null}
          <Button
            title={plan === 'free' ? 'Buy a campaign package' : exhausted ? 'Renew or upgrade' : 'Renew / change package'}
            variant={(plan === 'free' || exhausted) ? 'red' : 'ghost'}
            onPress={() => navigation.navigate('Plans')}
          />
        </Card>

        <Eyebrow tone="mist">Channel & details</Eyebrow>
        <Card style={{ paddingHorizontal: 16, paddingVertical: 2, marginTop: 8, marginBottom: 16 }}>
          <Row label="Channel link" value={user?.channelUrl} />
          <Row label="Other streaming link" value={user?.otherUrl} />
          <Row label="Primary genre" value={user?.genre} />
          <Row label="Email" value={user?.email} last />
        </Card>

        <Eyebrow tone="mist">Placement</Eyebrow>
        <Card style={{ padding: 14, marginTop: 8, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          {Icons.wa(colors.wa)}
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 13, color: colors.navyInk }}>Priority placement</Text>
            <Text style={{ fontSize: 11, color: colors.mist2, marginTop: 2 }}>
              {plan === 'free' ? 'Buy a campaign to surface higher in Browse' : 'Your package ranks your titles higher in Browse'}
            </Text>
          </View>
        </Card>

        <Button title="Sign out" variant="ghost" onPress={logout} style={{ marginBottom: 8 }} />
        <Text style={{ textAlign: 'center', fontSize: 10.5, color: colors.mist2, marginTop: 8 }}>
          CRITIFLIX Creator Studio · {user?.id || 'CT-0000'}
        </Text>
      </Pad>
    </Screen>
  );
}
