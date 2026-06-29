import React, { useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/tokens';
import { Screen, TopBand, Pad } from '../../components/Screen';
import { Card, Button, Bar, Eyebrow, Score } from '../../components/ui';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

const DESTS = [
  { key: 'bank', label: 'GTBank · ****4821', sub: 'Bank transfer · ~2 min', dest: 'GTBank ****4821' },
  { key: 'mobile_money', label: 'OPay · 0803***210', sub: 'Mobile money · instant', dest: 'OPay 0803***210' },
];

export default function Redeem({ route, navigation }) {
  const { refresh } = useAuth();
  const balance = route.params?.balance ?? 0;
  const [amount] = useState(Math.min(8000, balance));
  const [sel, setSel] = useState(0);

  const cashout = async () => {
    try {
      const d = DESTS[sel];
      const res = await api.redeem({ points: amount, method: d.key, destination: d.dest });
      await refresh();
      Alert.alert('Cashout requested', `₦${res.cashout.amount.toLocaleString()} to ${d.dest}. New balance: ${res.balance.toLocaleString()} pts.`);
      navigation.goBack();
    } catch (e) { Alert.alert('Could not cash out', e.message); }
  };

  return (
    <Screen>
      <TopBand title="Redeem points" onBack={() => navigation.goBack()} />
      <Pad style={{ marginTop: 16, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: colors.mist }}>Converting</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 }}>
          <Score value={amount.toLocaleString()} suffix=" pts" size={42} />
        </View>
        <Text style={{ fontSize: 12, color: colors.mist2 }}>= <Text style={{ color: colors.red, fontWeight: '700' }}>₦{amount.toLocaleString()}</Text> · rate 1 pt = ₦1</Text>
        <View style={{ alignSelf: 'stretch', marginTop: 16, marginHorizontal: 4 }}>
          <Bar pct={(amount / Math.max(balance, 1)) * 100} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ fontSize: 10.5, color: colors.mist2 }}>0</Text>
            <Text style={{ fontSize: 10.5, color: colors.mist2 }}>balance {balance.toLocaleString()}</Text>
          </View>
        </View>
      </Pad>

      <Pad style={{ marginTop: 18 }}>
        <Eyebrow tone="mist">Send to</Eyebrow>
        <View style={{ height: 10 }} />
        {DESTS.map((d, i) => (
          <Pressable key={d.key} onPress={() => setSel(i)}>
            <Card style={[styles.dest, sel === i && { borderColor: colors.red, borderWidth: 1.5 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={styles.destIcon}>
                  <Svg width={17} height={17} viewBox="0 0 24 24"><Path d="M3 7h18v12H3zM3 7l2-3h12l2 3" stroke={colors.navy} strokeWidth="1.7" fill="none" /></Svg>
                </View>
                <View>
                  <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.navyInk }}>{d.label}</Text>
                  <Text style={{ fontSize: 11, color: colors.mist2 }}>{d.sub}</Text>
                </View>
              </View>
              {sel === i && (
                <Svg width={20} height={20} viewBox="0 0 24 24"><Circle cx="12" cy="12" r="9" stroke={colors.red} strokeWidth="2.2" fill="none" /><Path d="M8 12l3 3 5-6" stroke={colors.red} strokeWidth="2.2" fill="none" /></Svg>
              )}
            </Card>
          </Pressable>
        ))}
        <Card style={styles.fee}>
          <Text style={{ color: colors.mist, fontSize: 12.5 }}>You’ll receive</Text>
          <Text style={{ fontWeight: '700', color: colors.navyInk }}>₦{(amount - 25).toLocaleString()}</Text>
        </Card>
        <Button title={`Cash out ₦${amount.toLocaleString()}`} onPress={cashout} />
      </Pad>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dest: { padding: 13, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  destIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.paper2, alignItems: 'center', justifyContent: 'center' },
  fee: { padding: 13, marginVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
