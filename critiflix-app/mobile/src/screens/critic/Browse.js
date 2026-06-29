import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, Image, ActivityIndicator, ScrollView, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/tokens';
import { Screen, TopBand, Pad, Icons } from '../../components/Screen';
import { Card, Chip, Stars } from '../../components/ui';
import { api, mediaUrl } from '../../api';
import NotificationBell from '../../components/NotificationBell';

// Priority listing options surfaced as tabs. "For you" uses the server's blended
// ranking (rating + recency + trending + creator subscription tier).
const SORTS = [
  { key: 'priority', label: 'For you' },
  { key: 'top', label: 'Top rated' },
  { key: 'new', label: 'New' },
  { key: 'trending', label: 'Trending' },
];

// Dependency-free list/grid switch.
function ViewToggle({ value, onChange }) {
  const Btn = ({ k, render }) => {
    const active = value === k;
    return (
      <Pressable onPress={() => onChange(k)}
        style={{ width: 36, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
          backgroundColor: active ? colors.navy : '#fff', borderWidth: 1, borderColor: active ? colors.navy : colors.line }}>
        {render(active ? '#fff' : colors.navy)}
      </Pressable>
    );
  };
  return (
    <View style={{ flexDirection: 'row', gap: 7 }}>
      <Btn k="list" render={(c) => (
        <View style={{ gap: 3 }}>{[0, 1, 2].map((i) => <View key={i} style={{ width: 15, height: 2.5, borderRadius: 2, backgroundColor: c }} />)}</View>
      )} />
      <Btn k="grid" render={(c) => (
        <View style={{ width: 15, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {[0, 1, 2, 3].map((i) => <View key={i} style={{ width: 6, height: 6, borderRadius: 1.5, backgroundColor: c, marginBottom: 3 }} />)}
        </View>
      )} />
    </View>
  );
}

export default function Browse({ navigation }) {
  const [titles, setTitles] = useState(null);
  const [sort, setSort] = useState('priority');
  const [view, setView] = useState('list');               // 'list' | 'grid'
  const { width } = useWindowDimensions();
  const cols = width >= 720 ? 3 : 2;                       // responsive grid columns
  const itemPct = cols === 3 ? '31.8%' : '48%';

  const load = useCallback((s) => {
    setTitles(null);
    api.titles(s).then(setTitles).catch(() => setTitles([]));
  }, []);
  const refresh = useCallback(() => api.titles(sort).then(setTitles).catch(() => setTitles([])), [sort]);
  useFocusEffect(useCallback(() => { load(sort); }, [sort, load]));

  const choose = (s) => { setSort(s); load(s); };
  const open = (id) => navigation.navigate('FilmDetail', { id });
  const featured = titles?.[0];

  const ListRow = (m) => (
    <Pressable key={m.id} onPress={() => open(m.id)}>
      <Card style={{ padding: 11, marginBottom: 11, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={{ width: 60, height: 80, borderRadius: 11, backgroundColor: colors.navy2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          {mediaUrl(m.posterSmall || m.posterLarge) ? (
            <Image source={{ uri: mediaUrl(m.posterSmall || m.posterLarge) }} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
          ) : Icons.youtube(11)}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 14, color: colors.navyInk }} numberOfLines={1}>{m.title}</Text>
          <Text style={{ fontSize: 11, color: colors.mist, marginTop: 2, marginBottom: 6 }} numberOfLines={1}>{m.creator?.name} · {m.genre}</Text>
          <Stars value={Math.round((m.score || 0) / 2)} />
        </View>
        <Chip label={`+${m.reward} pts`} tone="red" />
      </Card>
    </Pressable>
  );

  const GridItem = (m) => (
    <Pressable key={m.id} onPress={() => open(m.id)} style={{ width: itemPct, marginBottom: 14 }}>
      <Card style={{ overflow: 'hidden' }}>
        <View style={{ width: '100%', aspectRatio: 2 / 3, backgroundColor: colors.navy2, alignItems: 'center', justifyContent: 'center' }}>
          {mediaUrl(m.posterSmall || m.posterLarge) ? (
            <Image source={{ uri: mediaUrl(m.posterSmall || m.posterLarge) }} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
          ) : Icons.youtube(18)}
          <View style={{ position: 'absolute', top: 7, left: 7 }}><Chip label={`+${m.reward}`} tone="red" /></View>
          {m.featured ? <View style={{ position: 'absolute', top: 7, right: 7 }}><Chip label="★ Featured" tone="navy" /></View> : null}
        </View>
        <View style={{ padding: 9 }}>
          <Text style={{ fontWeight: '700', fontSize: 12.5, color: colors.navyInk }} numberOfLines={1}>{m.title}</Text>
          <Text style={{ fontSize: 10, color: colors.mist2, marginTop: 2, marginBottom: 5 }} numberOfLines={1}>{m.creator?.name} · {m.genre}</Text>
          <Stars value={Math.round((m.score || 0) / 2)} />
        </View>
      </Card>
    </Pressable>
  );

  return (
    <Screen onRefresh={refresh}>
      <TopBand title="Now showing" subtitle="Earn points for every review" right={<NotificationBell />}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 16, gap: 8 }}>
          {SORTS.map((t) => {
            const active = t.key === sort;
            return (
              <Pressable key={t.key} onPress={() => choose(t.key)}
                style={{ backgroundColor: active ? '#fff' : 'rgba(255,255,255,0.10)', paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999 }}>
                <Text style={{ color: active ? colors.navy : 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700' }}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </TopBand>

      {!titles ? (
        <ActivityIndicator color={colors.red} style={{ marginTop: 40 }} />
      ) : titles.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 40, color: colors.mist }}>No titles yet.</Text>
      ) : (
        <Pad style={{ marginTop: 14 }}>
          {/* count + list/grid toggle */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 12, color: colors.mist2, fontWeight: '600' }}>{titles.length} title{titles.length === 1 ? '' : 's'}</Text>
            <ViewToggle value={view} onChange={setView} />
          </View>

          {view === 'grid' ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {titles.map(GridItem)}
            </View>
          ) : (
            <>
              {featured && (
                <Pressable onPress={() => open(featured.id)}>
                  <Card style={{ overflow: 'hidden', marginBottom: 14 }}>
                    <View style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.navy2, alignItems: 'center', justifyContent: 'center' }}>
                      {mediaUrl(featured.posterLarge || featured.posterSmall) ? (
                        <Image source={{ uri: mediaUrl(featured.posterLarge || featured.posterSmall) }} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : null}
                      <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>{Icons.play('#fff', 18)}</View>
                      <View style={{ position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 6 }}>
                        <Chip label={`+${featured.reward} pts`} tone="red" />
                        {featured.featured ? <Chip label="Featured" tone="navy" /> : null}
                      </View>
                    </View>
                    <View style={{ padding: 13 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontWeight: '800', fontSize: 16, color: colors.navyInk }} numberOfLines={1}>{featured.title}</Text>
                        <Stars value={Math.round((featured.score || 0) / 2)} />
                      </View>
                      <Text style={{ fontSize: 11.5, color: colors.mist, marginTop: 3, marginBottom: 9 }}>{featured.creator?.name} · {featured.genre} · {featured.runtime}</Text>
                      <Text numberOfLines={2} style={{ fontSize: 12, color: colors.mist, lineHeight: 18 }}>{featured.synopsis}</Text>
                    </View>
                  </Card>
                </Pressable>
              )}
              {titles.slice(1).map(ListRow)}
            </>
          )}
        </Pad>
      )}
    </Screen>
  );
}
