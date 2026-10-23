import React, { useCallback, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/tokens';
import { Screen, TopBand, Pad, IconCircle, Icons } from '../../components/Screen';
import { Card, Button, Ticket, Eyebrow, Bar } from '../../components/ui';
import { api } from '../../api';

function Progress({ label, value, target }) {
  const pct = Math.min(100, (value / target) * 100);
  const done = value >= target;
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={{ fontSize: 11.5, color: colors.mist, fontWeight: '600' }}>{label}</Text>
        <Text style={{ fontSize: 11.5, fontWeight: '700', color: done ? colors.green : colors.navyInk }}>
          {value.toLocaleString()} / {target.toLocaleString()}{done ? ' ✓' : ''}
        </Text>
      </View>
      <Bar pct={pct} color={done ? colors.green : colors.red} height={5} />
    </View>
  );
}

const naira = (n) => `₦${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const EARN = [
  { key: 'watch', label: 'Complete a watch', icon: 'M8 5v14l11-7z', tone: 'red' },
  { key: 'review', label: 'Publish a review', icon: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z', tone: 'navy' },
  { key: 'rating', label: 'Rate a film', icon: 'M12 2l3 6.5 7 .9-5 4.8 1.3 7L12 18l-6.6 3.2L6.7 14l-5-4.8 7-.9z', tone: 'red' },
  { key: 'referral', label: 'Refer a critic', icon: 'M16 11a4 4 0 10-8 0M4 21a8 8 0 0116 0', tone: 'navy' },
];

export default function Points({ navigation }) {
  const [data, setData] = useState(null);
  const load = useCallback(() => api.points().then(setData).catch(() => {}), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen onRefresh={load}>
      <TopBand title="Points" right={<IconCircle>{Icons.bell()}</IconCircle>} />
      {!data ? (
        <ActivityIndicator color={colors.red} style={{ marginTop: 40 }} />
      ) : (
        <Pad style={{ marginTop: 10 }}>
          <Ticket style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View>
                <Text style={{ color: '#fff', opacity: 0.85, fontSize: 11 }}>Cashable points</Text>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 38, marginTop: 4 }}>{(data.balance || 0).toLocaleString()}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: '#fff', opacity: 0.85, fontSize: 11 }}>Worth</Text>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 20, marginTop: 4 }}>{naira(data.nairaValue)}</Text>
              </View>
            </View>
            {data.nairaPerPoint ? (
              <Text style={{ color: '#fff', opacity: 0.8, fontSize: 11, marginTop: 8 }}>1 point = {naira(data.nairaPerPoint)} · {(data.lifetime || 0).toLocaleString()} points earned in total</Text>
            ) : null}
          </Ticket>

          {data.benchmark ? (
            <Card style={{ padding: 14, marginBottom: 16, borderWidth: 1.5, borderColor: data.benchmark.reached ? '#CFE6DA' : colors.line }}>
              <Text style={{ fontWeight: '700', fontSize: 13.5, color: colors.navyInk }}>
                {data.benchmark.reached ? 'Benchmark reached' : `Your first ${data.benchmark.threshold.toLocaleString()} points`}
              </Text>
              <Text style={{ fontSize: 11.5, color: colors.mist, marginTop: 3, marginBottom: 12 }}>
                {data.benchmark.reached
                  ? 'Every point you earn now is cashable.'
                  : `The first ${data.benchmark.threshold.toLocaleString()} points you earn are a benchmark with no cash value. After that, every point counts toward your cashout. ${data.benchmark.remaining.toLocaleString()} to go.`}
              </Text>
              <Progress label="Benchmark" value={data.benchmark.earned} target={Math.max(1, data.benchmark.threshold)} />
            </Card>
          ) : null}

          <Button
            title={data.canCashout ? 'Convert points to reward' : data.benchmark && !data.benchmark.reached ? 'Cashout opens after the benchmark' : 'Not enough points to cash out'}
            variant={data.canCashout ? 'navy' : 'ghost'}
            disabled={!data.canCashout}
            onPress={() => navigation.navigate('Redeem', { balance: data.balance })}
            style={{ marginBottom: 18 }}
          />

          <Eyebrow tone="mist">How you earn</Eyebrow>
          <View style={{ height: 11 }} />
          {EARN.map((e) => (
            <Card key={e.key} style={{ padding: 13, marginBottom: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: e.tone === 'red' ? colors.redSoft : colors.paper2, alignItems: 'center', justifyContent: 'center' }}>
                  <Svg width={16} height={16} viewBox="0 0 24 24"><Path d={e.icon} stroke={e.tone === 'red' ? colors.red : colors.navy} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.navyInk }}>{e.label}</Text>
              </View>
              <Text style={{ fontWeight: '700', fontSize: 13, color: colors.red }}>+{data.earnRates[e.key]}</Text>
            </Card>
          ))}
        </Pad>
      )}
    </Screen>
  );
}
