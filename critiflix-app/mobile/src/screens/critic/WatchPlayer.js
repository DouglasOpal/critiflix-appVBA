import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Linking, useWindowDimensions, StyleSheet } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { colors } from '../../theme/tokens';
import { Screen, TopBand, Pad } from '../../components/Screen';
import { Button, Bar } from '../../components/ui';
import { api } from '../../api';

// Extract the 11-char YouTube id from any common URL form.
function ytId(url) {
  if (!url) return null;
  const m = String(url).match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function WatchPlayer({ route, navigation }) {
  const { id, title, movieUrl, requiredPct = 0.75 } = route.params || {};
  const videoId = ytId(movieUrl);
  const { width: winW, height: winH } = useWindowDimensions();
  const playerH = Math.min(Math.round(winW * 9 / 16), Math.round(winH * 0.55)); // responsive 16:9, capped

  const playerRef = useRef(null);
  const [pct, setPct] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const [playerError, setPlayerError] = useState(null);
  const lastSent = useRef(0);

  // Report the current playhead each tick. The server credits only real elapsed
  // time (anti fast-forward) and returns the authoritative watched %.
  const report = useCallback(async (t, d) => {
    if (!d) return;
    const reachedMs = Math.round(t);
    // throttle network: report every ~5s of playback, or once the gate is near
    if (Math.abs(reachedMs - lastSent.current) >= 5 || !lastSent.current) {
      lastSent.current = reachedMs;
      try {
        const res = await api.watchProgress(id, reachedMs, Math.round(d));
        if (typeof res.percent === 'number') setPct(res.percent); // server's real %
        if (res.completed && !unlocked) setUnlocked(true);
      } catch {}
    }
  }, [id, unlocked]);

  // Poll the player clock once a second while it's mounted.
  useEffect(() => {
    if (!videoId) return;
    const iv = setInterval(async () => {
      const pl = playerRef.current;
      if (!pl) return;
      try {
        const [t, d] = await Promise.all([pl.getCurrentTime(), pl.getDuration()]);
        if (d > 0) report(t, d);
      } catch {}
    }, 1000);
    return () => clearInterval(iv);
  }, [videoId, report]);

  const onState = async (state) => {
    if (state === 'ended' && playerRef.current) { try { const d = await playerRef.current.getDuration(); report(d, d); } catch {} }
  };

  const onError = (err) => {
    const e = String(err || '');
    setPlayerError(
      /embed|150|101/.test(e)
        ? 'This film can’t be played inside the app — its owner either turned off embedding or marked it age-restricted (those can only be watched on YouTube).'
        : /not_found|100|unavailable/.test(e)
        ? 'This video is unavailable — it may be private, deleted, or set to “not listed”.'
        : 'This video can’t be played here right now. You can watch it on YouTube instead.'
    );
  };

  if (!videoId) {
    return (
      <Screen>
        <TopBand title="Watch film" onBack={() => navigation.goBack()} />
        <Pad style={{ marginTop: 20 }}>
          <Text style={{ color: colors.mist }}>This title's full-movie link isn't a recognised YouTube URL, so it can't be watched here.</Text>
        </Pad>
      </Screen>
    );
  }

  const remaining = Math.max(0, Math.ceil(requiredPct * 100 - pct * 100));

  return (
    <Screen scroll={false}>
      <TopBand title={title || 'Watch film'} subtitle="Watch 75% to unlock your review" onBack={() => navigation.goBack()} />

      <View style={{ width: '100%', height: playerH, backgroundColor: '#000' }}>
        <YoutubePlayer
          ref={playerRef}
          height={playerH}
          width={winW}
          videoId={videoId}
          play={false}
          initialPlayerParams={{ controls: true, modestbranding: true, rel: false, preventFullScreen: false }}
          webViewProps={{ allowsInlineMediaPlayback: true, androidLayerType: 'hardware' }}
          onChangeState={onState}
          onError={onError}
        />
        {playerError ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(11,26,51,0.96)', alignItems: 'center', justifyContent: 'center', padding: 22 }]}>
            <Text style={{ color: '#fff', textAlign: 'center', fontSize: 13, lineHeight: 19, marginBottom: 14 }}>{playerError}</Text>
            <Pressable onPress={() => Linking.openURL(movieUrl).catch(() => {})} style={{ backgroundColor: colors.red, borderRadius: 11, paddingHorizontal: 18, paddingVertical: 11 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Open on YouTube</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <Pad style={{ marginTop: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ fontSize: 12, color: colors.mist, fontWeight: '600' }}>Watched {Math.round(pct * 100)}%</Text>
          <Text style={{ fontSize: 12, color: unlocked ? colors.green : colors.mist2, fontWeight: '700' }}>
            {unlocked ? 'Review unlocked ✓' : `${remaining}% to unlock`}
          </Text>
        </View>
        <Bar pct={pct * 100} color={unlocked ? colors.green : colors.red} height={6} />
        <Button
          title={unlocked ? 'Continue to review' : 'Keep watching to review'}
          disabled={!unlocked}
          onPress={() => navigation.replace('Review', { id, title })}
          style={{ marginTop: 18 }}
        />
        <Text style={{ fontSize: 11, color: colors.mist2, textAlign: 'center', marginTop: 10 }}>
          Your progress is tracked here so points only count when you've genuinely watched the film.
        </Text>
      </Pad>
    </Screen>
  );
}
