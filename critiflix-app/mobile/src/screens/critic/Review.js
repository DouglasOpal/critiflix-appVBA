import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
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

  const toggle = (t) => setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const publish = async () => {
    try {
      const res = await api.review(id, { rating, headline, body, tags });
      await refresh();
      Alert.alert('Published', `You earned +${res.awarded} points. New title score: ${res.score}/10.`);
      navigation.navigate('BrowseHome');
    } catch (e) { Alert.alert('Could not publish', e.message); }
  };

  return (
    <Screen>
      <TopBand
        title="Your review"
        subtitle={title}
        onBack={() => navigation.goBack()}
        right={<Pressable onPress={publish} style={styles.publish}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Publish</Text></Pressable>}
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

        <Button title={`Publish review · +100 pts`} onPress={publish} style={{ marginTop: 18 }} />
      </Pad>
    </Screen>
  );
}

const styles = StyleSheet.create({
  publish: { backgroundColor: colors.red, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 9 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 14, borderColor: '#CFE6DA', backgroundColor: colors.greenSoft },
  input: { paddingHorizontal: 14, paddingVertical: 13, marginTop: 8, marginBottom: 13 },
});
