import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Image, Pressable, ActivityIndicator, Alert } from 'react-native';
import { colors } from '../../theme/tokens';
import { Screen, TopBand, Pad } from '../../components/Screen';
import { Card, Button, Chip, Stars, Avatar, Eyebrow } from '../../components/ui';
import { api, mediaUrl } from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function CriticProfile({ route, navigation }) {
  const { id } = route.params || {};
  const { user } = useAuth();
  const [c, setC] = useState(null);
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () => api.criticProfile(id).then((d) => { setC(d); setFollowing(d.isFollowing); setFollowers(d.followers || 0); })
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

  const isSelf = user?.id === id || user?._id === id;

  return (
    <Screen onRefresh={load}>
      <TopBand title="Critic" onBack={() => navigation.goBack()}>
        <Pad style={{ paddingBottom: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar label={c.name?.[0] || 'C'} color={c.avatarColor || colors.red} size={52} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{c.name}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11.5, marginTop: 2 }}>
                {followers.toLocaleString()} followers · {(c.reviewCount || 0).toLocaleString()} reviews
              </Text>
            </View>
            {c.rank ? <Chip label={`★ ${c.rank}`} tone="navy" /> : null}
          </View>
        </Pad>
      </TopBand>

      <Pad style={{ marginTop: 14 }}>
        {!isSelf ? (
          <Button title={following ? 'Following ✓' : 'Follow'} variant={following ? 'ghost' : 'red'} onPress={toggleFollow} disabled={busy} />
        ) : (
          <Card style={{ padding: 12, alignItems: 'center' }}><Text style={{ fontSize: 12, color: colors.mist2 }}>This is you</Text></Card>
        )}

        <View style={{ marginTop: 18, marginBottom: 10 }}><Eyebrow tone="mist">Reviews</Eyebrow></View>
        {(c.reviews || []).length === 0 ? (
          <Text style={{ color: colors.mist2, fontSize: 12.5 }}>No reviews yet.</Text>
        ) : c.reviews.map((rv) => (
          <Pressable key={rv.id} onPress={() => rv.title && navigation.navigate('FilmDetail', { id: rv.title.id })} disabled={!rv.title}>
            <Card style={{ padding: 13, marginBottom: 11 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontWeight: '700', fontSize: 13.5, color: colors.navyInk }} numberOfLines={1}>{rv.title?.title || 'A film'}</Text>
                <Stars value={rv.rating} />
              </View>
              {rv.headline ? <Text style={{ fontSize: 13, fontWeight: '700', color: colors.navyInk, marginBottom: 3 }}>{rv.headline}</Text> : null}
              {rv.body ? <Text style={{ fontSize: 12.5, color: colors.mist, lineHeight: 18 }} numberOfLines={3}>{rv.body}</Text> : null}
            </Card>
          </Pressable>
        ))}
      </Pad>
    </Screen>
  );
}
