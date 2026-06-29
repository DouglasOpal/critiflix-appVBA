import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, Share } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/tokens';
import { Screen, TopBand, Pad, Icons } from '../../components/Screen';
import { Card, Button, Eyebrow, Avatar } from '../../components/ui';
import { api } from '../../api';

export default function Referrals() {
  const [data, setData] = useState(null);
  const load = useCallback(() => api.referrals().then(setData).catch(() => {}), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const share = (channel) => {
    const msg = `Join me on CritiFlix and earn points reviewing films: ${data?.link}`;
    Share.share({ message: msg }).catch(() => {});
  };

  return (
    <Screen onRefresh={load}>
      <TopBand title="Refer & earn">
        <Pad style={{ paddingBottom: 18, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 30 }}>+{data?.rewardPerReferral ?? 250} pts</Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 }}>for every critic who joins &amp; reviews</Text>
        </Pad>
      </TopBand>

      <Pad style={{ marginTop: 14 }}>
        <Card style={{ padding: 14, marginBottom: 14 }}>
          <Eyebrow tone="mist">Your link</Eyebrow>
          <View style={{ marginTop: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed', borderRadius: 11, padding: 11, backgroundColor: colors.paper }}>
            <Text style={{ fontSize: 12, color: colors.navy }}>{data?.link?.replace('https://', '') || 'critiflix.app/r/…'}</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.red }}>Copy</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 11 }}>
            <Button title="WhatsApp" variant="wa" icon={Icons.wa()} onPress={() => share('wa')} style={{ flex: 1 }} />
            <Button title="Facebook" variant="navy" icon={Icons.fb()} onPress={() => share('fb')} style={{ flex: 1 }} />
          </View>
        </Card>

        <Card style={{ padding: 14, flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 }}>
          {[[`${data?.joined ?? 0}`, 'Joined'], [`${data?.reviewed ?? 0}`, 'Reviewed'], [`${(data?.pointsEarned ?? 0).toLocaleString()}`, 'Pts earned']].map(([v, l]) => (
            <View key={l} style={{ alignItems: 'center' }}>
              <Text style={{ fontWeight: '800', fontSize: 22, color: colors.navyInk }}>{v}</Text>
              <Text style={{ fontSize: 10, color: colors.mist2, marginTop: 2 }}>{l}</Text>
            </View>
          ))}
        </Card>

        <Eyebrow tone="mist">Recent referrals</Eyebrow>
        <View style={{ height: 11 }} />
        {(data?.referrals || []).length === 0 ? (
          <Text style={{ fontSize: 12.5, color: colors.mist2 }}>No referrals yet — share your link to start earning.</Text>
        ) : data.referrals.map((rfr, i) => (
          <Card key={`${rfr.name}-${i}`} style={{ padding: 11, marginBottom: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar label={rfr.name?.[0] || '?'} color={colors.navy} size={32} />
              <View><Text style={{ fontSize: 13, fontWeight: '600', color: colors.navyInk }}>{rfr.name}</Text><Text style={{ fontSize: 11, color: colors.mist2 }}>{rfr.reviewed ? 'Joined & reviewed' : 'Joined, no review yet'}</Text></View>
            </View>
            <Text style={{ fontWeight: '700', fontSize: 13, color: rfr.reviewed ? colors.green : colors.gold }}>{rfr.reviewed ? `+${data?.rewardPerReferral ?? 250}` : 'Pending'}</Text>
          </Card>
        ))}
      </Pad>
    </Screen>
  );
}
