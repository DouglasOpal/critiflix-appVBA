import React, { useCallback, useState } from 'react';
import { View, Text, ActivityIndicator, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/tokens';
import { Screen, TopBand, Pad } from '../../components/Screen';
import { Card, Chip, Avatar, Score, Eyebrow } from '../../components/ui';
import { api, mediaUrl } from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const load = useCallback(() => api.studio().then(setData).catch(() => {}), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen onRefresh={load}>
      <TopBand
        title={data?.studio?.name || user?.name || 'Studio'}
        subtitle="Welcome back"
        right={<Avatar label={(data?.studio?.name || 'K')[0]} color={colors.red} />}
      >
        <Pad style={{ paddingBottom: 18 }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 13, padding: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11 }}>Plan · <Text style={{ color: '#fff', fontWeight: '700' }}>{(data?.studio?.plan || 'starter').toUpperCase()}</Text></Text>
            <Chip label={(data?.studio?.plan && data.studio.plan !== 'starter') ? 'Priority placement' : 'Standard listing'} tone={(data?.studio?.plan && data.studio.plan !== 'starter') ? 'red' : 'navy'} />
          </View>
        </Pad>
      </TopBand>

      {!data ? (
        <ActivityIndicator color={colors.red} style={{ marginTop: 40 }} />
      ) : (
        <Pad style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            {[[data.stats.avgScore, 'Avg score'], [data.stats.watches.toLocaleString(), 'Watches'], [data.stats.reviews, 'Reviews']].map(([v, l]) => (
              <Card key={l} style={{ flex: 1, padding: 14, alignItems: 'center' }}>
                <Text style={{ fontWeight: '800', fontSize: 21, color: colors.navyInk }}>{v}</Text>
                <Text style={{ fontSize: 10, color: colors.mist2, marginTop: 4 }}>{l}</Text>
              </Card>
            ))}
          </View>

          <Eyebrow tone="mist">Your titles</Eyebrow>
          <View style={{ height: 11 }} />
          {data.titles.map((t) => {
            const label =
              t.status === 'scored' ? `Scored · ${t.reviewCount} critics`
              : t.status === 'pending' ? 'Awaiting approval'
              : t.status === 'delisted' ? 'Delisted'
              : t.status === 'ended' ? 'Ended'
              : `${t.reviewCount}/12 reviews`;
            return (
              <Card key={t.id} style={{ padding: 11, marginBottom: 9, flexDirection: 'row', gap: 11, alignItems: 'center' }}>
                <View style={{ width: 42, height: 56, borderRadius: 9, backgroundColor: colors.navy2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                  {mediaUrl(t.posterSmall || t.posterLarge) ? (
                    <Image source={{ uri: mediaUrl(t.posterSmall || t.posterLarge) }} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', fontSize: 13.5, color: colors.navyInk }} numberOfLines={1}>{t.title}</Text>
                  <Text style={{ fontSize: 10.5, color: colors.mist2, marginTop: 3 }}>{label}</Text>
                </View>
                {t.score != null
                  ? <Score value={t.score} suffix="" size={18} color={colors.red} />
                  : t.status === 'pending' ? <Chip label="Pending" tone="gold" /> : null}
              </Card>
            );
          })}
        </Pad>
      )}
    </Screen>
  );
}
