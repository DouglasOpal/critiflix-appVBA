import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../../theme/tokens';
import { Screen, TopBand, Pad, Icons } from '../../components/Screen';
import { Card, Button, Chip, Eyebrow, Stars, Score } from '../../components/ui';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

const TAGS = ['Sound design', 'Pacing', 'Lead', 'Cinematography', 'Score'];

export default function Review({ route, navigation }) {
  const { id, title } = route.params;
  const { refresh } = useAuth();
  const [rating, setRating] = useState(4);
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState(['Sound design']);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false); // blocks a second tap before the state update lands

  const toggle = (t) => setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const publish = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      const res = await api.review(id, { rating, headline, body, tags });
      await refresh();
      Alert.alert('Published', earnedMessage(res));
      navigation.navigate('BrowseHome');
    } catch (e) {
      // Already reviewed (e.g. an earlier tap got through): go back to the title, where commenting is open.
      if (/already reviewed/i.test(e.message)) {
        Alert.alert('Already reviewed', 'Your review is in. You can add comments on the title page.');
        navigation.goBack();
      } else {
        Alert.alert('Could not publish', e.message);
      }
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <TopBand
        title="Your review"
        subtitle={title}
        onBack={() => navigation.goBack()}
        right={
          <Pressable onPress={publish} disabled={submitting} style={[styles.publish, submitting && { opacity: 0.7 }]}>
            {submitting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Publish</Text>}
          </Pressable>
        }
      />
      <Pad style={{ marginTop: 14 }}>
        <Card style={styles.banner}>
          {Icons.check(colors.green, 20)}
          <Text style={{ flex: 1, fontSize: 12, color: '#0F7A52' }}>
            <Text style={{ fontWeight: '700' }}>Welcome back from YouTube.</Text> Watch confirmed — finish your review to claim points.
          </Text>
        </Card>

        <Card style={{ padding: 18, alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ fontSize: 11, color: colors.mist, marginBottom: 10 }}>Tap to rate</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginVertical: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setRating(n)}><Stars value={n <= rating ? 1 : 0} size={30} max={1} /></Pressable>
            ))}
          </View>
          <Score value={(rating * 2).toFixed(1)} size={30} />
        </Card>

        <Eyebrow tone="mist">Headline</Eyebrow>
        <Card style={styles.input}>
          <TextInput value={headline} onChangeText={setHeadline} placeholder="A grainy, gut-punch of a thriller" placeholderTextColor={colors.mist2}
            style={{ fontSize: 14, fontWeight: '600', color: colors.navyInk }} />
        </Card>

        <Eyebrow tone="mist">Your review</Eyebrow>
        <Card style={[styles.input, { minHeight: 104 }]}>
          <TextInput value={body} onChangeText={setBody} multiline placeholder="What worked, what didn’t…" placeholderTextColor={colors.mist2}
            style={{ fontSize: 13, color: colors.mist, lineHeight: 20, textAlignVertical: 'top' }} />
        </Card>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TAGS.map((t) => (
            <Pressable key={t} onPress={() => toggle(t)}>
              <Chip label={`+ ${t}`} tone={tags.includes(t) ? 'red' : 'default'} />
            </Pressable>
          ))}
        </View>

        <Button title={submitting ? 'Publishing…' : 'Publish review'} onPress={publish} loading={submitting} style={{ marginTop: 18 }} />
      </Pad>
    </Screen>
  );
}

function earnedMessage(res) {
  const score = `New title score: ${res.score}/10.`;
  if (!res.awarded) return `Thanks for your review. ${score}`;
  const b = res.benchmark;
  if (res.toBenchmark > 0 && b && !b.reached) {
    return `You earned +${res.awarded} points toward your first ${b.threshold.toLocaleString()}. ${b.remaining.toLocaleString()} to go before points start counting as cash. ${score}`;
  }
  if (res.toBenchmark > 0) {
    return `You earned +${res.awarded} points and passed the benchmark. ${res.cashable} of them are cashable. ${score}`;
  }
  return `You earned +${res.awarded} cashable points. ${score}`;
}

const styles = StyleSheet.create({
  publish: { backgroundColor: colors.red, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 9, minWidth: 72, alignItems: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 14, borderColor: '#CFE6DA', backgroundColor: colors.greenSoft },
  input: { paddingHorizontal: 14, paddingVertical: 13, marginTop: 8, marginBottom: 13 },
});
