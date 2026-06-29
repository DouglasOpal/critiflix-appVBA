import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/tokens';
import { Screen, TopBand, Pad } from '../../components/Screen';
import { Card, Button, Chip } from '../../components/ui';
import { api } from '../../api';

const GENRES = ['Drama', 'Thriller', 'Comedy', 'Romance', 'Action', 'Documentary', 'Horror'];

export default function EditTitle({ route, navigation }) {
  const { id } = route.params || {};
  const [t, setT] = useState(null);
  const [title, setTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [genre, setGenre] = useState('Drama');
  const [runtime, setRuntime] = useState('');
  const [movieUrl, setMovieUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => api.title(id).then((d) => {
    setT(d); setTitle(d.title || ''); setSynopsis(d.synopsis || '');
    setGenre(d.genre || 'Drama'); setRuntime(d.runtime || ''); setMovieUrl(d.movieUrl || '');
  }).catch((e) => Alert.alert('Error', e.message)), [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const words = synopsis.trim().split(/\s+/).filter(Boolean).length;

  const save = async () => {
    if (!title.trim()) return Alert.alert('Title required', 'Give your film a title.');
    if (words > 500) return Alert.alert('Synopsis too long', 'Keep the synopsis to 500 words or fewer.');
    setSaving(true);
    try {
      await api.editTitle(id, { title: title.trim(), synopsis, genre, runtime, movieUrl: movieUrl.trim() });
      Alert.alert('Saved', 'Your changes are live — no re-approval needed.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) { Alert.alert('Could not save', e.message); }
    finally { setSaving(false); }
  };

  if (!t) return <Screen><ActivityIndicator color={colors.red} style={{ marginTop: 60 }} /></Screen>;

  const delisted = t.status === 'delisted';

  return (
    <Screen>
      <TopBand title="Edit title" subtitle={t.code} onBack={() => navigation.goBack()} />
      <Pad style={{ marginTop: 14 }}>
        {delisted ? (
          <Card style={{ padding: 13, marginBottom: 14, backgroundColor: colors.redSoft }}>
            <Text style={{ fontSize: 12.5, color: colors.red, fontWeight: '700' }}>This title was delisted by an admin for a suspected violation and can’t be edited. Contact support to resolve it.</Text>
          </Card>
        ) : (
          <Text style={{ fontSize: 11.5, color: colors.mist2, marginBottom: 14 }}>
            Status: {t.status === 'pending' ? 'awaiting admin approval' : t.status}. Edits go live immediately and don’t need re-approval.
          </Text>
        )}

        <Text style={styles.label}>Title</Text>
        <Card style={styles.field}><TextInput style={styles.input} value={title} onChangeText={setTitle} editable={!delisted} placeholder="Film title" placeholderTextColor={colors.mist2} /></Card>

        <Text style={styles.label}>Genre</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
          {GENRES.map((g) => (
            <Pressable key={g} onPress={delisted ? undefined : () => setGenre(g)}>
              <Chip label={g} tone={g === genre ? 'red' : 'default'} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Runtime</Text>
        <Card style={styles.field}><TextInput style={styles.input} value={runtime} onChangeText={setRuntime} editable={!delisted} placeholder="e.g. 1h 52m" placeholderTextColor={colors.mist2} /></Card>

        <Text style={styles.label}>Full-movie link (YouTube)</Text>
        <Card style={styles.field}><TextInput style={styles.input} value={movieUrl} onChangeText={setMovieUrl} editable={!delisted} autoCapitalize="none" placeholder="https://youtu.be/…" placeholderTextColor={colors.mist2} /></Card>

        <Text style={styles.label}>Synopsis <Text style={{ color: words > 500 ? colors.red : colors.mist2 }}>({words}/500 words)</Text></Text>
        <Card style={styles.field}><TextInput style={[styles.input, { height: 120, textAlignVertical: 'top' }]} value={synopsis} onChangeText={setSynopsis} editable={!delisted} multiline placeholder="What's the film about?" placeholderTextColor={colors.mist2} /></Card>

        {!delisted && <Button title={saving ? 'Saving…' : 'Save changes'} onPress={save} disabled={saving} style={{ marginTop: 8 }} />}
      </Pad>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', color: colors.navyInk, marginBottom: 6, marginTop: 4 },
  field: { paddingHorizontal: 12, paddingVertical: 2, marginBottom: 14 },
  input: { fontSize: 14, color: colors.navyInk, paddingVertical: 11 },
});
