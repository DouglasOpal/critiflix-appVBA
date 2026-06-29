import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, Linking } from 'react-native';
import { colors } from '../../theme/tokens';
import { Screen, TopBand, Pad } from '../../components/Screen';
import { Card, Button, Chip } from '../../components/ui';
import { Icons } from '../../components/Screen';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

const FEATURES = {
  starter: ['1 active title', 'Standard listing'],
  pro: ['10 active titles', 'Promo boosts + WhatsApp/FB', 'Featured in Now Showing'],
  studio: ['Unlimited titles', 'Priority placement + analytics', 'Top-of-feed placement'],
};

export default function Plans({ navigation, route }) {
  const { finishOnboard, refresh } = useAuth();
  const onboarding = route?.params?.onboarding;
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    api.config().then((c) => {
      const order = ['starter', 'pro', 'studio'];
      setPlans(order.map((id) => ({ ...c.plans[id], features: FEATURES[id], popular: id === 'pro' })));
    }).catch(() => {});
  }, []);

  const choose = async (plan) => {
    try {
      const res = plan !== 'starter' ? await api.subscribe(plan) : await api.subscribe('starter');
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
          Subscription is for creators only. It unlocks more uploads and priority placement so critics discover your films first.
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
                {p.price ? <Text style={styles.per}>/mo</Text> : null}
              </View>
            </View>
            {p.features.map((f) => (
              <View key={f} style={styles.feat}>
                {Icons.check ? null : null}
                <View style={{ marginRight: 8 }}>{_check(p.popular)}</View>
                <Text style={{ fontSize: 12, color: colors.mist }}>{f}</Text>
              </View>
            ))}
            <Button
              title={p.price === 0 ? 'Start free' : `Subscribe to ${p.name}`}
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
