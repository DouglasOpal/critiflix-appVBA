import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Image, Pressable, ActivityIndicator, Alert, Linking } from 'react-native';
import { colors } from '../../theme/tokens';
import { Screen, TopBand, Pad, Icons } from '../../components/Screen';
import { Card, Button, Chip, Stars, Avatar, Eyebrow } from '../../components/ui';
import { api, mediaUrl } from '../../api';

export default function CreatorProfile({ route, navigation }) {
  const { id } = route.params || {};
  const [c, setC] = useState(null);
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () => api.creator(id).then((d) => { setC(d); setFollowing(d.isFollowing); setFollowers(d.followers || 0); })
      .catch((e) => Alert.alert('Error', e.message)),
    [id]
  );
  useEffect(() => { load(); }, [load]);

  const toggleFollow = async () => {
    setBusy(true);
    try {
      const res = following ? await api.unfollow(id) : await api.follow(id);
      setFollowing(res.following);
      setFollowers(res.followers);
    } catch (e) { Alert.alert('Could not update', e.message); }
    finally { setBusy(false); }
  };

  if (!c) return <Screen><ActivityIndicator color={colors.red} style={{ marginTop: 60 }} /></Screen>;

  return (
    <Screen onRefresh={load}>
      <TopBand title="Studio" onBack={() => navigation.goBack()}>
        <Pad style={{ paddingBottom: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar label={c.name?.[0] || 'C'} color={colors.red} size={52} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{c.name}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11.5, marginTop: 2 }}>
                {followers.toLocaleString()} followers · {c.titles?.length || 0} titles
              </Text>
            </View>
            <Chip label={(c.plan || 'starter').toUpperCase()} tone={c.plan === 'starter' ? 'navy' : 'red'} />
          </View>
        </Pad>
      </TopBand>

      <Pad style={{ marginTop: 14 }}>
        <Button title={following ? 'Following ✓' : 'Follow'} variant={following ? 'ghost' : 'red'} onPress={toggleFollow} disabled={busy} />

        {(c.channelUrl || c.genre) ? (
          <Card style={{ padding: 14, marginTop: 14 }}>
            {c.genre ? <Row label="Primary genre" value={c.genre} /> : null}
            {c.country ? <Row label="Country" value={c.country} /> : null}
            {c.channelUrl ? (
              <Pressable onPress={() => Linking.openURL(c.channelUrl).catch(() => {})} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                {Icons.youtube(15)}<Text style={{ color: colors.red, fontWeight: '600', fontSize: 12.5 }}>Visit channel ›</Text>
              </Pressable>
            ) : null}
          </Card>
        ) : null}

        <View style={{ marginTop: 18, marginBottom: 10 }}><Eyebrow tone="mist">Titles</Eyebrow></View>
        {(c.titles || []).length === 0 ? (
          <Text style={{ color: colors.mist2, fontSize: 12.5 }}>No published titles yet.</Text>
        ) : c.titles.map((m) => (
          <Pressable key={m.id} onPress={() => navigation.navigate('FilmDetail', { id: m.id })}>
            <Card style={{ padding: 11, marginBottom: 11, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <View style={{ width: 54, height: 72, borderRadius: 10, backgroundColor: colors.navy2, overflow: 'hidden', justifyContent: 'flex-end', padding: 6 }}>
                {mediaUrl(m.posterSmall) ? <Image source={{ uri: mediaUrl(m.posterSmall) }} style={{ position: 'absolute', width: '100%', height: '100%' }} /> : Icons.youtube(11)}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', fontSize: 13.5, color: colors.navyInk }}>{m.title}</Text>
                <Text style={{ fontSize: 11, color: colors.mist, marginTop: 2, marginBottom: 6 }}>{m.genre} · +{m.watchPoints} pts</Text>
                <Stars value={Math.round((m.score || 0) / 2)} />
              </View>
            </Card>
          </Pressable>
        ))}
      </Pad>
    </Screen>
  );
}

function Row({ label, value }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ fontSize: 12, color: colors.mist2 }}>{label}</Text>
      <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.navyInk }}>{value}</Text>
    </View>
  );
}
