import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, Linking } from 'react-native';
import { colors } from '../../theme/tokens';
import { Screen, TopBand, Pad } from '../../components/Screen';
import { Card, Button, Chip } from '../../components/ui';
import { Icons } from '../../components/Screen';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

const FEATURES = {
  free:    ['3 titles (one-time)', 'Funds no points', 'Editing locked 3 months'],
  curious: ['5 active titles', 'Editing + analytics', 'Featured placement'],
  growth:  ['15 active titles', 'Bigger points campaign', 'Featured + analytics'],
  premium: ['Unlimited titles', 'Largest points campaign', 'Top-of-feed placement'],
};
// A campaign funds a points pool = 2.5 × price that critics draw from as they watch/review.
const poolFor = (price) => Math.round((0.5 * price) / 0.2);

export default function Plans({ navigation, route }) {
  const { finishOnboard, refresh } = useAuth();
  const onboarding = route?.params?.onboarding;
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    api.config().then((c) => {
      const order = ['free', 'curious', 'growth', 'premium'];
      setPlans(order.map((id) => ({ ...c.plans[id], features: FEATURES[id], popular: id === 'growth' })));
    }).catch(() => {});
  }, []);

  const choose = async (plan) => {
    try {
      const res = await api.subscribe(plan);
      if (res?.status === 'pending' && res.checkoutUrl) {
        Linking.openURL(res.checkoutUrl).catch(() => {});
        Alert.alert('Complete payment', 'Finish checkout in your browser. Your plan activates as soon as payment is confirmed.');
      }
      await refresh();
      if (onboarding) finishOnboard(); else navigation.goBack();
    } catch (e) { Alert.alert('Subscription failed', e.message); }
  };

  const fmt = (p) => (p === 0 ? 'Free' : `₦${p.toLocaleString()}`);

  return (
    <Screen>
      <TopBand title="Pick a plan" subtitle="Subscribe to publish" onBack={onboarding ? undefined : () => navigation.goBack()} />
      <Pad style={{ marginTop: 14 }}>
        <Text style={{ fontSize: 12, color: colors.mist, marginBottom: 14, lineHeight: 18 }}>
          Campaign packages are for creators. Each package is a one-off that funds a pool of points critics earn by watching &amp; reviewing your films. When the pool runs out, renew or move up to a bigger package — it's consumption-based, not monthly.
        </Text>
        {plans.map((p) => (
          <Card key={p.id} style={[styles.plan, p.popular && styles.popular]}>
            <View style={styles.planHead}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.planName}>{p.name}</Text>
                {p.popular ? <Chip label="Popular" tone="red" /> : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <Text style={styles.price}>{fmt(p.price)}</Text>
                {p.price ? <Text style={styles.per}>campaign</Text> : null}
              </View>
            </View>
            {p.features.map((f) => (
              <View key={f} style={styles.feat}>
                {Icons.check ? null : null}
                <View style={{ marginRight: 8 }}>{_check(p.popular)}</View>
                <Text style={{ fontSize: 12, color: colors.mist }}>{f}</Text>
              </View>
            ))}
            {p.price > 0 ? <Text style={{ fontSize: 11.5, color: colors.red, fontWeight: '700', marginTop: 8 }}>Funds ~{poolFor(p.price).toLocaleString()} points for critics</Text> : null}
            <Button
              title={p.price === 0 ? 'Start free' : `Buy ${p.name} campaign`}
              variant={p.popular ? 'red' : 'ghost'}
              onPress={() => choose(p.id)}
              style={{ marginTop: 11, paddingVertical: 11 }}
            />
          </Card>
        ))}
      </Pad>
    </Screen>
  );
}

function _check(red) {
  return Icons.check ? Icons.check(red ? colors.red : colors.green, 14) : null;
}

const styles = StyleSheet.create({
  plan: { padding: 16, marginBottom: 12 },
  popular: { borderWidth: 2, borderColor: colors.red },
  planHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  planName: { fontWeight: '800', fontSize: 17, color: colors.navyInk },
  price: { fontWeight: '800', fontSize: 22, color: colors.navyInk, letterSpacing: -0.5 },
  per: { fontSize: 11, color: colors.mist2, marginBottom: 4 },
  feat: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
});
