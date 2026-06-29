import React, { useCallback, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/tokens';
import { Screen, TopBand, Pad } from '../../components/Screen';
import { Card } from '../../components/ui';
import { api } from '../../api';

const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const ICON = { new_title: '🎬', promo: '📣', title_status: '🏷️', system: '🔔' };

export default function Notifications({ navigation }) {
  const [data, setData] = useState(null);

  const load = useCallback(() => api.notifications().then(setData).catch(() => setData({ notifications: [], unread: 0 })), []);
  useFocusEffect(useCallback(() => {
    load();
    api.markNotificationsRead().catch(() => {}); // opening the screen marks all read
  }, [load]));

  const open = (n) => {
    if (n.data?.titleId) navigation.navigate('FilmDetail', { id: n.data.titleId });
  };

  return (
    <Screen onRefresh={load}>
      <TopBand title="Notifications" onBack={() => navigation.goBack()} />
      <Pad style={{ marginTop: 14 }}>
        {!data ? null : data.notifications.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🔔</Text>
            <Text style={{ color: colors.mist2, fontSize: 13 }}>You're all caught up.</Text>
          </View>
        ) : data.notifications.map((n) => (
          <Pressable key={n.id} onPress={() => open(n)}>
            <Card style={{ padding: 13, marginBottom: 9, flexDirection: 'row', gap: 11, backgroundColor: n.read ? undefined : colors.redSoft }}>
              <Text style={{ fontSize: 20 }}>{ICON[n.type] || '🔔'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', fontSize: 13.5, color: colors.navyInk }}>{n.title}</Text>
                {n.body ? <Text style={{ fontSize: 12, color: colors.mist, marginTop: 2, lineHeight: 17 }}>{n.body}</Text> : null}
                <Text style={{ fontSize: 10.5, color: colors.mist2, marginTop: 5 }}>{timeAgo(n.createdAt)}</Text>
              </View>
            </Card>
          </Pressable>
        ))}
      </Pad>
    </Screen>
  );
}
