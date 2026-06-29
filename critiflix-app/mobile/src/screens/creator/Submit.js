import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, Image, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as ImageManipulator from 'expo-image-manipulator';
import { colors } from '../../theme/tokens';
import { Screen, TopBand, Pad, Icons } from '../../components/Screen';
import { Card, Button, Bar, Eyebrow } from '../../components/ui';
import { api, mediaUrl } from '../../api';

const MAX_BYTES = 200 * 1024 * 1024; // 200 MB
const MAX_SECONDS = 180;             // 3 minutes
const fmtMB = (b) => (b / 1048576).toFixed(1) + ' MB';
const fmtDur = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// iCloud-offloaded items can't be exported by the picker (PHPhotosErrorDomain 3164).
const ICLOUD_HELP =
  'That file is stored in iCloud and isn’t downloaded to this device yet. Open it once in the Photos app so it finishes downloading, then pick it again — or choose a file that’s already saved on the device.';
function describePickError(e) {
  const m = String(e?.message || e || '');
  if (m.includes('3164') || m.includes('PHPhotos') || /network access/i.test(m)) return ICLOUD_HELP;
  return m || 'Something went wrong. Please try again.';
}

export default function Submit({ navigation }) {
  const [title, setTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [movieUrl, setMovieUrl] = useState('');
  const [genre, setGenre] = useState('');
  const [runtime, setRuntime] = useState('');

  const [trailer, setTrailer] = useState(null);   // { url, durationSec, sizeBytes, previewUri }
  const [poster, setPoster] = useState(null);     // { posterSmall, posterLarge, previewUri }
  const [busyTrailer, setBusyTrailer] = useState(false);
  const [busyPoster, setBusyPoster] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Always open a fresh form — clear everything whenever the screen gains focus.
  useFocusEffect(
    useCallback(() => {
      setTitle(''); setSynopsis(''); setMovieUrl(''); setGenre(''); setRuntime('');
      setTrailer(null); setPoster(null); setBusyTrailer(false); setBusyPoster(false); setSubmitting(false);
    }, [])
  );

  const words = synopsis.trim().split(/\s+/).filter(Boolean).length;
  const over = words > 500;

  // ---- STEP 1: pick + upload the trailer (its own request) ----
  const pickTrailer = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permission needed', 'Allow library access to pick a trailer.');

      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 1 });
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0];

      const durationSec = a.duration ? Math.round(a.duration / 1000) : null;
      if (durationSec && durationSec > MAX_SECONDS) return Alert.alert('Trailer too long', `Must be 3 minutes or shorter. This is ${fmtDur(durationSec)}.`);

      // Confirm the file is actually on-device (not an iCloud placeholder).
      let info = null;
      try { info = await FileSystem.getInfoAsync(a.uri, { size: true }); } catch {}
      if (info && info.exists === false) return Alert.alert('Can’t use that video', ICLOUD_HELP);
      let sizeBytes = a.fileSize || info?.size || 0;
      if (sizeBytes && sizeBytes > MAX_BYTES) return Alert.alert('Trailer too large', `Must be 200MB or smaller. This is ${fmtMB(sizeBytes)}.`);

      let previewUri = null;
      try { previewUri = (await VideoThumbnails.getThumbnailAsync(a.uri, { time: 1000 })).uri; } catch {}

      setBusyTrailer(true);
      const up = await api.uploadVideo({ uri: a.uri, name: a.fileName || 'trailer.mp4', type: 'video/mp4' }, durationSec || undefined);
      setTrailer({ url: up.url, durationSec: up.durationSec || durationSec, sizeBytes: up.sizeBytes || sizeBytes, previewUri });
    } catch (e) {
      Alert.alert('Couldn’t add that trailer', describePickError(e));
    } finally {
      setBusyTrailer(false);
    }
  };

  // ---- STEP 2: pick + upload the poster, as two responsive sizes (separate requests) ----
  const pickPoster = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permission needed', 'Allow library access to pick a poster.');

      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1, allowsEditing: true, aspect: [2, 3] });
      if (res.canceled || !res.assets?.length) return;

      const srcUri = res.assets[0].uri;
      let info = null;
      try { info = await FileSystem.getInfoAsync(srcUri, { size: true }); } catch {}
      if (info && info.exists === false) return Alert.alert('Can’t use that image', ICLOUD_HELP);

      setBusyPoster(true);
      const { posterSmall, posterLarge, previewUri } = await makePosters(srcUri);
      setPoster({ posterSmall, posterLarge, previewUri });
    } catch (e) {
      Alert.alert('Couldn’t add that poster', describePickError(e));
    } finally {
      setBusyPoster(false);
    }
  };

  // Resize a source image into small (~360w) + large (~800w) and upload each separately.
  const makePosters = async (srcUri) => {
    const small = await ImageManipulator.manipulateAsync(srcUri, [{ resize: { width: 360 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG });
    const large = await ImageManipulator.manipulateAsync(srcUri, [{ resize: { width: 800 } }], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG });
    const up = async (uri, tag) => (await api.uploadImage({ uri, name: `poster-${tag}.jpg`, type: 'image/jpeg' })).url;
    return { posterSmall: await up(small.uri, 'small'), posterLarge: await up(large.uri, 'large'), previewUri: large.uri };
  };

  const submit = async () => {
    if (!title) return Alert.alert('Missing', 'Add a title.');
    if (!trailer) return Alert.alert('Missing', 'Upload a 3-minute trailer.');
    if (!movieUrl) return Alert.alert('Missing', 'Add the full-movie link.');
    if (over) return Alert.alert('Too long', 'Synopsis must be 500 words or fewer.');
    try {
      setSubmitting(true);
      // If no poster was uploaded, fall back to a frame grabbed from the trailer.
      let posters = poster;
      if (!posters && trailer.previewUri) posters = await makePosters(trailer.previewUri);

      await api.submitTitle({
        title, synopsis, genre, runtime,
        trailerUrl: trailer.url,
        trailerDurationSec: trailer.durationSec,
        trailerSizeBytes: trailer.sizeBytes,
        posterSmall: posters?.posterSmall || null,
        posterLarge: posters?.posterLarge || null,
        movieUrl,
      });
      Alert.alert('Submitted', 'Your title is now in review.');
      navigation.navigate('Titles');
    } catch (e) {
      Alert.alert('Could not submit', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <TopBand
        title="New title"
        onBack={() => navigation.goBack()}
        right={<Pressable onPress={submit} style={styles.submit}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Submit</Text></Pressable>}
      />
      <Pad style={{ marginTop: 16 }}>
        {/* ---- trailer (uploaded on pick) ---- */}
        <Eyebrow tone="mist">Trailer video</Eyebrow>
        <Pressable onPress={pickTrailer} disabled={busyTrailer || submitting} style={{ marginTop: 7 }}>
          {!trailer ? (
            <Card style={styles.upload}>
              {busyTrailer ? <ActivityIndicator color={colors.red} /> : <View style={styles.uploadIcon}>{Icons.play('#fff', 20)}</View>}
              <Text style={styles.upTitle}>{busyTrailer ? 'Uploading trailer…' : 'Upload 3-minute trailer'}</Text>
              <Text style={styles.upHint}>MP4 / MOV · max 3:00 · max 200MB · critics watch this preview</Text>
            </Card>
          ) : (
            <Card style={{ overflow: 'hidden', marginBottom: 14 }}>
              <View style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.navy2, alignItems: 'center', justifyContent: 'center' }}>
                {trailer.previewUri ? <Image source={{ uri: trailer.previewUri }} style={StyleSheet.absoluteFill} /> : null}
                <View style={styles.playPill}>{Icons.play('#fff', 18)}</View>
                <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: colors.green, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ color: '#fff', fontSize: 10.5, fontWeight: '700' }}>Uploaded ✓</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.navyInk }}>{trailer.durationSec ? fmtDur(trailer.durationSec) : '—'} · {fmtMB(trailer.sizeBytes || 0)}</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.red }}>Replace</Text>
              </View>
            </Card>
          )}
        </Pressable>

        {/* ---- poster (separate upload) ---- */}
        <Eyebrow tone="mist">Poster / thumbnail</Eyebrow>
        <Pressable onPress={pickPoster} disabled={busyPoster || submitting} style={{ marginTop: 7, marginBottom: 14 }}>
          <Card style={[styles.posterCard, poster ? null : { borderStyle: 'dashed', borderColor: colors.line, borderWidth: 1.5 }]}>
            <View style={styles.posterThumb}>
              {busyPoster ? <ActivityIndicator color={colors.red} />
                : poster?.previewUri ? <Image source={{ uri: poster.previewUri }} style={StyleSheet.absoluteFill} />
                : Icons.plus(colors.mist2)}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: colors.navyInk }}>{poster ? 'Poster uploaded ✓' : 'Upload a poster image'}</Text>
              <Text style={{ fontSize: 11, color: colors.mist2, marginTop: 2 }}>
                {poster ? 'Saved in two sizes for fast, responsive lists' : 'Optional · we’ll otherwise use a trailer frame'}
              </Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.red }}>{poster ? 'Change' : 'Add'}</Text>
          </Card>
        </Pressable>

        <Field label="Title"><TextInput value={title} onChangeText={setTitle} placeholder="The Lagos Tape" placeholderTextColor={colors.mist2} style={inputStyle} /></Field>

        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Eyebrow tone="mist">Synopsis</Eyebrow>
            <Text style={{ fontSize: 10.5, color: over ? colors.red : colors.mist2, fontWeight: '600' }}>{words} / 500 words</Text>
          </View>
          <Card style={{ padding: 13, marginTop: 7, minHeight: 84 }}>
            <TextInput value={synopsis} onChangeText={setSynopsis} multiline placeholder="A bootleg cassette surfaces in a Surulere market…" placeholderTextColor={colors.mist2}
              style={{ fontSize: 12.5, color: colors.mist, lineHeight: 19, textAlignVertical: 'top' }} />
          </Card>
          <View style={{ marginTop: 7 }}><Bar pct={(words / 500) * 100} color={colors.red} height={4} /></View>
        </View>

        <Field label="Full movie link" hintYT>
          <TextInput value={movieUrl} onChangeText={setMovieUrl} placeholder="youtube.com/watch?v=…" placeholderTextColor={colors.mist2} style={inputStyle} autoCapitalize="none" />
        </Field>
        <Text style={{ fontSize: 10.5, color: colors.mist2, marginTop: -6, marginBottom: 12 }}>Critics are redirected here to watch the full film.</Text>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="Genre"><TextInput value={genre} onChangeText={setGenre} style={inputStyle} /></Field></View>
          <View style={{ flex: 1 }}><Field label="Runtime"><TextInput value={runtime} onChangeText={setRuntime} style={inputStyle} /></Field></View>
        </View>

        <Button title={submitting ? 'Submitting…' : 'Submit for review'} onPress={submit} disabled={submitting} style={{ marginTop: 4 }} />
        {submitting ? <ActivityIndicator color={colors.red} style={{ marginTop: 12 }} /> : null}
      </Pad>
    </Screen>
  );
}

const inputStyle = { fontSize: 13.5, fontWeight: '600', color: colors.navyInk, paddingVertical: 12 };
function Field({ label, children, hintYT }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Eyebrow tone="mist">{label}</Eyebrow>
        {hintYT ? Icons.youtube(14) : null}
      </View>
      <Card style={{ paddingHorizontal: 14, marginTop: 7 }}>{children}</Card>
    </View>
  );
}

const styles = StyleSheet.create({
  submit: { backgroundColor: colors.red, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 9 },
  upload: { padding: 20, alignItems: 'center', marginBottom: 14, borderStyle: 'dashed', borderWidth: 1.5, borderColor: colors.red, backgroundColor: colors.redSoft },
  uploadIcon: { width: 50, height: 50, borderRadius: 14, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  upTitle: { fontWeight: '700', fontSize: 14, color: colors.navyInk },
  upHint: { fontSize: 11, color: colors.mist, marginTop: 3, textAlign: 'center' },
  playPill: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  posterCard: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  posterThumb: { width: 46, height: 62, borderRadius: 9, backgroundColor: colors.paper2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
