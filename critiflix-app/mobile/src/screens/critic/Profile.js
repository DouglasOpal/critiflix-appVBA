import React, { useState } from 'react';
import { View, Text, Pressable, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { colors } from '../../theme/tokens';
import { Screen, TopBand, Pad } from '../../components/Screen';
import { Card, Chip, Bar, Eyebrow, Button } from '../../components/ui';
import { api, mediaUrl } from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function Profile() {
  const { user, logout, refresh } = useAuth();
  const pts = user?.points ?? 0;
  const [busyPic, setBusyPic] = useState(false);
  const avatar = mediaUrl(user?.avatarUrl);

  // Upload a profile picture (square), save it, refresh the session.
  const pickAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permission needed', 'Allow library access to set a photo.');
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 1 });
      if (res.canceled || !res.assets?.length) return;
      const src = res.assets[0].uri;
      let info = null;
      try { info = await FileSystem.getInfoAsync(src, { size: true }); } catch {}
      if (info && info.exists === false) return Alert.alert('Can’t use that image', 'That photo is stored in iCloud and isn’t downloaded yet. Open it once in Photos, then try again.');
      setBusyPic(true);
      const sized = await ImageManipulator.manipulateAsync(src, [{ resize: { width: 320 } }], { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG });
      const up = await api.uploadImage({ uri: sized.uri, name: 'avatar.jpg', type: 'image/jpeg' });
      await api.setAvatar(up.url);
      await refresh();
    } catch (e) { Alert.alert('Could not update photo', e.message); }
    finally { setBusyPic(false); }
  };

  return (
    <Screen>
      <TopBand title="Profile">
        <View style={{ alignItems: 'center', paddingBottom: 20 }}>
          <Pressable onPress={pickAvatar} disabled={busyPic} style={{ width: 78, height: 78, borderRadius: 39, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
            {busyPic ? <ActivityIndicator color="#fff" />
              : avatar ? <Image source={{ uri: avatar }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 30 }}>{user?.name?.[0] || 'A'}</Text>}
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 2, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>{avatar ? 'EDIT' : 'ADD PHOTO'}</Text>
            </View>
          </Pressable>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 21, marginTop: 11 }}>{user?.name}</Text>
          <Chip label={`★ ${user?.rank || 'Critic'} · Rank #${user?.rankNo || '—'}`} style={{ backgroundColor: 'rgba(255,255,255,0.16)', marginTop: 8 }} />
        </View>
      </TopBand>

      <Pad style={{ marginTop: 14 }}>
        <Card style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 }}>
          {[[(user?.reviewCount ?? 0).toLocaleString(), 'Reviews'], [pts.toLocaleString(), 'Points'], [(user?.followers ?? 0).toLocaleString(), 'Followers']].map(([v, l]) => (
            <View key={l} style={{ alignItems: 'center' }}>
              <Text style={{ fontWeight: '800', fontSize: 21, color: colors.navyInk }}>{v}</Text>
              <Text style={{ fontSize: 10, color: colors.mist2, marginTop: 2 }}>{l}</Text>
            </View>
          ))}
        </Card>

        <Card style={{ padding: 15, marginBottom: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 }}>
            <Text style={{ fontWeight: '600', fontSize: 12.5, color: colors.navyInk }}>Gold → Platinum</Text>
            <Text style={{ color: colors.mist2, fontSize: 12.5 }}>{pts.toLocaleString()} / 20,000 pts</Text>
          </View>
          <Bar pct={(pts / 20000) * 100} />
          <Text style={{ fontSize: 11, color: colors.mist2, marginTop: 9 }}>{Math.max(0, 20000 - pts).toLocaleString()} points to Platinum — unlocks a 1.25× multiplier.</Text>
        </Card>

        <Button title="Sign out" variant="ghost" onPress={logout} />
      </Pad>
    </Screen>
  );
}
