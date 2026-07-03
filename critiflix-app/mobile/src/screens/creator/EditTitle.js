import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/tokens';
import { Screen, TopBand, Pad } from '../../components/Screen';
import { Card, Button, Chip, Avatar, Eyebrow, Stars } from '../../components/ui';
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
  const [deleting, setDeleting] = useState(false);

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

  const removeTitle = () => {
    Alert.alert('Delete title', 'Permanently remove this title? This also removes its reviews and cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setDeleting(true);
        try {
          await api.deleteTitle(id);
          navigation.navigate('Titles');
        } catch (e) { Alert.alert('Could not delete', e.message); setDeleting(false); }
      } },
    ]);
  };

  const toggleLike = async (rid) => {
    try {
      const res = await api.likeReview(id, rid);
      setT((prev) => prev && { ...prev, reviews: prev.reviews.map((r) => ((r.id || r._id) === rid ? { ...r, liked: res.liked, likeCount: res.likeCount } : r)) });
    } catch (e) { Alert.alert('Could not update', e.message); }
  };
  const removeReview = (rid) => {
    Alert.alert('Delete review', 'Remove this comment from your title?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.deleteReviewAsCreator(id, rid);
          setT((prev) => prev && { ...prev, reviews: prev.reviews.filter((r) => (r.id || r._id) !== rid) });
        } catch (e) { Alert.alert('Could not delete', e.message); }
      } },
    ]);
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

        <Button title={deleting ? 'Deleting…' : 'Delete title'} variant="ghost" onPress={removeTitle} disabled={deleting}
          style={{ marginTop: 10, borderColor: colors.red }} />

        {/* comments/reviews left on this title — like or delete */}
        {(t.reviews || []).length > 0 ? (
          <View style={{ marginTop: 24 }}>
            <Eyebrow tone="mist">Critic reviews ({t.reviews.length})</Eyebrow>
            <View style={{ height: 10 }} />
            {t.reviews.map((rv) => (
              <Card key={rv._id || rv.id} style={{ padding: 13, marginBottom: 11 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 }}>
                    <Avatar label={rv.critic?.name?.[0] || 'C'} color={rv.critic?.avatarColor || colors.navy} size={32} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.navyInk }}>{rv.critic?.name || 'Critic'}</Text>
                      <Text style={{ fontSize: 10.5, color: colors.mist2 }}>{rv.critic?.code || ''}</Text>
                    </View>
                  </View>
                  <Stars value={rv.rating} />
                </View>
                {rv.headline ? <Text style={{ fontSize: 13, fontWeight: '700', color: colors.navyInk, marginTop: 9 }}>{rv.headline}</Text> : null}
                {rv.body ? <Text style={{ fontSize: 12.5, color: colors.mist, lineHeight: 18, marginTop: 3 }}>{rv.body}</Text> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 10 }}>
                  <Pressable onPress={() => toggleLike(rv.id || rv._id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={{ fontSize: 15 }}>{rv.liked ? '❤️' : '🤍'}</Text>
                    <Text style={{ fontSize: 12, color: rv.liked ? colors.red : colors.mist2, fontWeight: '700' }}>{rv.likeCount || 0}</Text>
                  </Pressable>
                  <Pressable onPress={() => removeReview(rv.id || rv._id)}>
                    <Text style={{ fontSize: 12, color: colors.mist2, fontWeight: '600' }}>Delete</Text>
                  </Pressable>
                </View>
              </Card>
            ))}
          </View>
        ) : null}
      </Pad>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', color: colors.navyInk, marginBottom: 6, marginTop: 4 },
  field: { paddingHorizontal: 12, paddingVertical: 2, marginBottom: 14 },
  input: { fontSize: 14, color: colors.navyInk, paddingVertical: 11 },
});
