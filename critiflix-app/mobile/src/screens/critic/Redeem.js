import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
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
  const [balance, setBalance] = useState(route.params?.balance ?? 0);
  const [amount, setAmount] = useState(route.params?.balance ?? 0);   // cash out the full cashable balance
  const [rate, setRate] = useState(null);                              // ₦ per point, set by admin
  const [fee, setFee] = useState(25);
  const busyRef = useRef(false);

  // Always use the live rate and cashable balance from the server.
  useEffect(() => {
    api.points().then((p) => {
      setBalance(p.balance || 0);
      setAmount(p.balance || 0);
      setRate(p.nairaPerPoint);
      if (typeof p.cashoutFee === 'number') setFee(p.cashoutFee);
    }).catch((e) => Alert.alert('Could not load your balance', e.message));
  }, []);
  const gross = rate ? Math.round(amount * rate * 100) / 100 : 0;
  const receive = Math.max(0, Math.round((gross - fee) * 100) / 100);
  const naira = (n) => `₦${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const [sel, setSel] = useState(0);
  const [step, setStep] = useState('choose');      // 'choose' -> 'verify'
  const [otpChannel, setOtpChannel] = useState('phone');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [busy, setBusy] = useState(false);

  // Step 1: send an SMS/WhatsApp token to authorise the cashout.
  const startCashout = async () => {
    if (busyRef.current) return;
    if (receive <= 0) return Alert.alert('Not enough points', `Your points must be worth more than the ${naira(fee)} cashout fee.`);
    busyRef.current = true;
    setBusy(true);
    try {
      const res = await api.redeemOtp(otpChannel);
      setSentTo(res.to || 'your number');
      setStep('verify');
    } catch (e) { Alert.alert('Could not send code', e.message); }
    finally { busyRef.current = false; setBusy(false); }
  };

  // Step 2: confirm the cashout with the code.
  const cashout = async () => {
    if (code.trim().length < 6) return Alert.alert('Code', 'Enter the 6-digit code sent to your number.');
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const d = DESTS[sel];
      const res = await api.redeem({ points: amount, method: d.key, destination: d.dest, code: code.trim(), channel: otpChannel });
      await refresh();
      Alert.alert('Cashout requested', `${naira(res.cashout.amount)} to ${d.dest}. New balance: ${res.balance.toLocaleString()} pts.`);
      navigation.goBack();
    } catch (e) { Alert.alert('Could not cash out', e.message); }
    finally { busyRef.current = false; setBusy(false); }
  };

  return (
    <Screen>
      <TopBand title="Redeem points" onBack={() => navigation.goBack()} />
      <Pad style={{ marginTop: 16, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: colors.mist }}>Converting</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 }}>
          <Score value={amount.toLocaleString()} suffix=" pts" size={42} />
        </View>
        {rate == null ? <ActivityIndicator color={colors.red} style={{ marginTop: 6 }} /> : (
          <Text style={{ fontSize: 12, color: colors.mist2 }}>= <Text style={{ color: colors.red, fontWeight: '700' }}>{naira(gross)}</Text> · rate 1 pt = {naira(rate)}</Text>
        )}
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
          <Text style={{ fontWeight: '700', color: colors.navyInk }}>{naira(receive)}</Text>
        </Card>
        {step === 'choose' ? (
          <View>
            <Text style={{ fontSize: 11.5, color: colors.mist2, marginBottom: 6 }}>Verify this cashout by:</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {[['phone', 'SMS'], ['whatsapp', 'WhatsApp']].map(([k, lbl]) => (
                <Pressable key={k} onPress={() => setOtpChannel(k)} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: otpChannel === k ? colors.navy : '#fff', borderWidth: 1, borderColor: otpChannel === k ? colors.navy : colors.line }}>
                  <Text style={{ color: otpChannel === k ? '#fff' : colors.navy, fontWeight: '700', fontSize: 12.5 }}>{lbl}</Text>
                </Pressable>
              ))}
            </View>
            <Button title={busy ? 'Sending code…' : `Cash out ${naira(receive)}`} onPress={startCashout} loading={busy} disabled={rate == null || receive <= 0} />
          </View>
        ) : (
          <View>
            <Text style={{ fontSize: 12, color: colors.mist, marginBottom: 8 }}>Enter the code sent to {sentTo} to authorise this cashout.</Text>
            <Card style={{ padding: 4, marginBottom: 12 }}>
              <TextInput value={code} onChangeText={setCode} placeholder="______" placeholderTextColor={colors.mist2} keyboardType="number-pad" maxLength={6} style={{ fontSize: 22, letterSpacing: 8, textAlign: 'center', color: colors.navyInk, paddingVertical: 12, fontWeight: '700' }} />
            </Card>
            <Button title={busy ? 'Verifying…' : `Confirm cashout ${naira(receive)}`} onPress={cashout} loading={busy} />
            <Pressable onPress={startCashout} disabled={busy} style={{ marginTop: 12, alignItems: 'center' }}><Text style={{ color: colors.red, fontSize: 12.5, fontWeight: '600' }}>Resend code</Text></Pressable>
          </View>
        )}
      </Pad>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dest: { padding: 13, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  destIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.paper2, alignItems: 'center', justifyContent: 'center' },
  fee: { padding: 13, marginVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
