import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Image, Pressable, Modal, ActivityIndicator, Alert, StyleSheet, TextInput, useWindowDimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors } from '../../theme/tokens';
import { Screen, TopBand, Pad, Icons } from '../../components/Screen';
import { Card, Button, Chip, Eyebrow, Avatar, Score, Stars } from '../../components/ui';
import { api, mediaUrl } from '../../api';

export default function FilmDetail({ route, navigation }) {
  const { id } = route.params;
  const { width: winW, height: winH } = useWindowDimensions();
  const [t, setT] = useState(null);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const postingRef = useRef(false); // blocks a second tap before the state update lands

  const load = useCallback(() => api.title(id).then(setT).catch((e) => Alert.alert('Error', e.message)), [id]);
  useEffect(() => { load(); }, [load]);

  // Trailer player (expo-video) — shown in a pop-up modal before the full film.
  const trailerSource = t?.trailerUrl ? mediaUrl(t.trailerUrl) : null;
  const player = useVideoPlayer(trailerSource, (p) => { p.loop = false; });

  const openTrailer = () => {
    if (!trailerSource) return Alert.alert('No trailer', 'This title has no trailer yet.');
    setTrailerOpen(true);
    try { player.play(); } catch {}
  };
  const closeTrailer = () => { try { player.pause(); } catch {} setTrailerOpen(false); };

  // Like/unlike a review (requirement 18); creators/admin can delete (requirement 2).
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

  // Comments (no rating, no points) — the only option once a critic has reviewed.
  const postComment = async () => {
    const body = comment.trim();
    if (!body || postingRef.current) return;
    postingRef.current = true;
    setPosting(true);
    try {
      const c = await api.addComment(id, body);
      setComment('');
      if (!c.duplicate) setT((prev) => prev && { ...prev, comments: [c, ...(prev.comments || [])] });
    } catch (e) { Alert.alert('Could not post comment', e.message); }
    finally { postingRef.current = false; setPosting(false); }
  };
  const removeComment = (cid) => {
    Alert.alert('Delete comment', 'Remove this comment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.deleteComment(id, cid);
          setT((prev) => prev && { ...prev, comments: (prev.comments || []).filter((c) => (c.id || c._id) !== cid) });
        } catch (e) { Alert.alert('Could not delete', e.message); }
      } },
    ]);
  };

  if (!t) return <Screen><ActivityIndicator color={colors.red} style={{ marginTop: 60 }} /></Screen>;

  const words = (t.synopsis || '').trim().split(/\s+/).filter(Boolean).length;
  const poster = mediaUrl(t.posterLarge || t.posterSmall);
  const heroH = Math.min(Math.round(winW * 9 / 16), Math.round(winH * 0.5)); // responsive 16:9, capped on tablets
  const alreadyWatched = !!t.watch?.completed;
  const watchedPct = Math.round((t.watch?.percent || 0) * 100);

  return (
    <Screen onRefresh={load}>
      {/* responsive trailer hero (16:9) */}
      <View style={{ width: '100%', height: heroH, backgroundColor: colors.navy2 }}>
        {poster ? <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Pressable onPress={openTrailer} style={styles.playBtn}>{Icons.play('#fff', 22)}</Pressable>
        </View>
        <View style={{ position: 'absolute', bottom: 12, right: 14 }}>
          <Chip label={`▶ Trailer${t.trailerDurationSec ? ` · ${Math.floor(t.trailerDurationSec / 60)}:${String(t.trailerDurationSec % 60).padStart(2, '0')}` : ''}`} tone="navy" />
        </View>
        <TopBand onBack={() => navigation.goBack()} right={null} curve={false} />
      </View>

      {/* trailer pop-up */}
      <Modal visible={trailerOpen} animationType="fade" transparent onRequestClose={closeTrailer}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{t.title} · Trailer</Text>
              <Pressable onPress={closeTrailer} hitSlop={10}><Text style={{ color: '#fff', fontSize: 20 }}>✕</Text></Pressable>
            </View>
            <View style={{ aspectRatio: 16 / 9, backgroundColor: '#000', borderRadius: 12, overflow: 'hidden' }}>
              {trailerSource ? <VideoView style={StyleSheet.absoluteFill} player={player} nativeControls allowsFullscreen contentFit="contain" /> : null}
            </View>
            <Button title="Watch the full film" variant="yt" icon={Icons.play('#fff', 16)}
              onPress={() => { closeTrailer(); navigation.navigate('WatchPlayer', { id, title: t.title, movieUrl: t.movieUrl, requiredPct: t.requiredWatchPct || 0.75, poster: t.posterLarge || t.posterSmall }); }}
              style={{ marginTop: 14 }} />
          </View>
        </View>
      </Modal>

      <Pad style={{ marginTop: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Eyebrow tone="mist">{t.genre}{t.runtime ? ` · ${t.runtime}` : ''}</Eyebrow>
            <Text style={{ fontWeight: '800', fontSize: 23, color: colors.navyInk, marginTop: 5 }}>{t.title}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Score value={t.score ?? '—'} size={30} />
            <Text style={{ fontSize: 9.5, color: colors.mist2, marginTop: 3 }}>{t.reviewCount} critics</Text>
          </View>
        </View>

        {/* creator row -> profile */}
        <Pressable onPress={() => navigation.navigate('CreatorProfile', { id: t.creator?._id || t.creator?.id })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginVertical: 12 }}>
          <Avatar label={t.creator?.name?.[0] || 'C'} color={colors.navy} size={30} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.navyInk }}>{t.creator?.name}</Text>
            <Text style={{ fontSize: 10.5, color: colors.mist2, marginTop: 2 }}>{(t.creator?.followers || 0).toLocaleString()} followers · View profile ›</Text>
          </View>
          {Icons.youtube(15)}
        </Pressable>

        <Eyebrow tone="mist">Synopsis</Eyebrow>
        <Text style={{ fontSize: 13, color: colors.mist, lineHeight: 21, marginTop: 8, marginBottom: 16 }}>
          {t.synopsis} <Text style={{ color: colors.mist2 }}>({words} words)</Text>
        </Text>

        {t.hasReviewed ? (
          <Card style={styles.doneCard}>
            {Icons.check(colors.green, 18)}
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#0F7A52', fontWeight: '700', fontSize: 13 }}>You've reviewed this film</Text>
              <Text style={{ color: '#0F7A52', fontSize: 11.5, marginTop: 2 }}>Points for this title are claimed. You can still join the conversation in the comments below.</Text>
            </View>
          </Card>
        ) : alreadyWatched ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, justifyContent: 'center', marginBottom: 10 }}>
              {Icons.check(colors.green, 16)}<Text style={{ color: colors.green, fontWeight: '700', fontSize: 12 }}>You watched {watchedPct}% — review unlocked</Text>
            </View>
            <Button title="Review & rate" onPress={() => navigation.navigate('Review', { id, title: t.title })} />
          </>
        ) : (
          <>
            <Button title="Watch full film" variant="yt" icon={Icons.play('#fff', 16)}
              onPress={() => navigation.navigate('WatchPlayer', { id, title: t.title, movieUrl: t.movieUrl, requiredPct: t.requiredWatchPct || 0.75, poster: t.posterLarge || t.posterSmall })} style={{ marginBottom: 10 }} />
            <Text style={{ textAlign: 'center', fontSize: 11, color: colors.mist2 }}>
              Watch {Math.round((t.requiredWatchPct || 0.75) * 100)}% in-app to review &amp; earn <Text style={{ color: colors.red, fontWeight: '700' }}>+{t.reward} pts</Text>
              {watchedPct > 0 ? ` · ${watchedPct}% watched` : ''}
            </Text>
          </>
        )}

        {/* critic reviews — tap a critic to view their profile and follow */}
        {(t.reviews || []).length > 0 ? (
          <View style={{ marginTop: 24 }}>
            <Eyebrow tone="mist">Critic reviews ({t.reviews.length})</Eyebrow>
            <View style={{ height: 10 }} />
            {t.reviews.map((rv) => {
              const cid = rv.critic?._id || rv.critic?.id;
              return (
                <Card key={rv._id || rv.id} style={{ padding: 13, marginBottom: 11 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Pressable onPress={() => cid && navigation.navigate('CriticProfile', { id: cid })} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 }}>
                      <Avatar label={rv.critic?.name?.[0] || 'C'} color={rv.critic?.avatarColor || colors.navy} size={32} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.navyInk }}>{rv.critic?.name || 'Critic'}</Text>
                        <Text style={{ fontSize: 10.5, color: colors.mist2 }}>{rv.critic?.rank ? `★ ${rv.critic.rank} · ` : ''}View profile ›</Text>
                      </View>
                    </Pressable>
                    <Stars value={rv.rating} />
                  </View>
                  {rv.headline ? <Text style={{ fontSize: 13, fontWeight: '700', color: colors.navyInk, marginTop: 9 }}>{rv.headline}</Text> : null}
                  {rv.body ? <Text style={{ fontSize: 12.5, color: colors.mist, lineHeight: 18, marginTop: 3 }}>{rv.body}</Text> : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 10 }}>
                    <Pressable onPress={() => toggleLike(rv.id || rv._id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Text style={{ fontSize: 15 }}>{rv.liked ? '❤️' : '🤍'}</Text>
                      <Text style={{ fontSize: 12, color: rv.liked ? colors.red : colors.mist2, fontWeight: '700' }}>{rv.likeCount || 0}</Text>
                    </Pressable>
                    {t.canManageReviews ? (
                      <Pressable onPress={() => removeReview(rv.id || rv._id)}>
                        <Text style={{ fontSize: 12, color: colors.mist2, fontWeight: '600' }}>Delete</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </Card>
              );
            })}
          </View>
        ) : null}

        {/* comments — no rating, no points */}
        <View style={{ marginTop: 24 }}>
          <Eyebrow tone="mist">Comments ({(t.comments || []).length})</Eyebrow>
          <View style={{ height: 10 }} />
          {t.canComment ? (
            <Card style={{ padding: 12, marginBottom: 12 }}>
              <TextInput
                value={comment}
                onChangeText={setComment}
                editable={!posting}
                multiline
                maxLength={1000}
                placeholder="Add a comment…"
                placeholderTextColor={colors.mist2}
                style={{ fontSize: 13, color: colors.navyInk, minHeight: 56, textAlignVertical: 'top' }}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ fontSize: 10.5, color: colors.mist2 }}>{comment.length}/1000</Text>
                <Button
                  title={posting ? 'Posting…' : 'Post comment'}
                  onPress={postComment}
                  loading={posting}
                  disabled={!comment.trim()}
                  variant="navy"
                  style={{ paddingVertical: 10, paddingHorizontal: 16 }}
                />
              </View>
            </Card>
          ) : (
            <Text style={{ fontSize: 11.5, color: colors.mist2, marginBottom: 10 }}>Watch and review this film to join the comments.</Text>
          )}
          {(t.comments || []).map((c) => (
            <View key={c.id || c._id} style={styles.comment}>
              <Avatar label={c.user?.name?.[0] || '?'} color={c.user?.avatarColor || colors.navy} size={28} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.navyInk }}>{c.user?.name || 'User'}</Text>
                  {c.user?.role === 'creator' ? <Chip label="Creator" tone="navy" /> : null}
                  <Text style={{ fontSize: 10.5, color: colors.mist2 }}>{timeAgo(c.createdAt)}</Text>
                </View>
                <Text style={{ fontSize: 12.5, color: colors.mist, lineHeight: 18, marginTop: 3 }}>{c.body}</Text>
                {c.canDelete ? (
                  <Pressable onPress={() => removeComment(c.id || c._id)} hitSlop={8} style={{ marginTop: 6 }}>
                    <Text style={{ fontSize: 11.5, color: colors.mist2, fontWeight: '600' }}>Delete</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </Pad>
    </Screen>
  );
}

function timeAgo(d) {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

const styles = StyleSheet.create({
  playBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: colors.navyInk, borderRadius: 18, padding: 14 },
  doneCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, backgroundColor: colors.greenSoft, borderColor: '#CFE6DA', borderWidth: 1 },
  comment: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
});
