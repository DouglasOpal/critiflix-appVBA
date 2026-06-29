import React, { useCallback, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/tokens';
import { Screen, TopBand, Pad } from '../../components/Screen';
import { Card, Chip, Score } from '../../components/ui';
import { api, mediaUrl } from '../../api';

const STATUS = {
  scored: { tone: 'green', label: 'Scored' },
  reviewing: { tone: 'default', label: 'Live' },
  pending: { tone: 'gold', label: 'Awaiting approval' },
  delisted: { tone: 'red', label: 'Delisted' },
  ended: { tone: 'default', label: 'Ended' },
  draft: { tone: 'default', label: 'Draft' },
};

export default function Titles({ navigation }) {
  const [data, setData] = useState(null);
  const load = useCallback(() => api.studio().then((d) => setData(d.titles)).catch(() => setData([])), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen onRefresh={load}>
      <TopBand title="Catalogue" subtitle="Tap a title to edit its details" />
      {!data ? <ActivityIndicator color={colors.red} style={{ marginTop: 40 }} /> : data.length === 0 ? (
        <Pad style={{ marginTop: 30 }}><Text style={{ color: colors.mist2, fontSize: 13 }}>No titles yet. Use the Submit tab to add your first film.</Text></Pad>
      ) : (
        <Pad style={{ marginTop: 14 }}>
          {data.map((t) => {
            const st = STATUS[t.status] || STATUS.draft;
            const poster = mediaUrl(t.posterSmall);
            return (
              <Pressable key={t.id} onPress={() => navigation.navigate('EditTitle', { id: t.id })}>
                <Card style={{ padding: 12, marginBottom: 10, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  {poster ? (
                    <Image source={{ uri: poster }} style={{ width: 48, height: 64, borderRadius: 9, backgroundColor: colors.navy2 }} resizeMode="cover" />
                  ) : (
                    <View style={{ width: 48, height: 64, borderRadius: 9, backgroundColor: colors.navy2, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 18 }}>🎬</Text></View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', fontSize: 14, color: colors.navyInk }} numberOfLines={1}>{t.title}</Text>
                    <Text style={{ fontSize: 11, color: colors.mist2, marginTop: 2, marginBottom: 7 }}>{t.genre}</Text>
                    <Chip label={st.label} tone={st.tone} />
                  </View>
                  {t.score != null && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Score value={t.score} suffix="" size={21} color={colors.red} />
                      <Text style={{ fontSize: 9, color: colors.mist2 }}>{t.reviewCount} critics</Text>
                    </View>
                  )}
                </Card>
              </Pressable>
            );
          })}
        </Pad>
      )}
    </Screen>
  );
}
