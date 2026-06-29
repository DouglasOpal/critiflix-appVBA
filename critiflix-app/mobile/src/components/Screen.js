import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, Keyboard, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors, radius } from '../theme/tokens';

// Navy top band that every screen opens with (title row). Sits below the device
// status bar using real safe-area insets (no simulated battery/time row).
export function TopBand({ title, subtitle, onBack, right, curve = true, children, pattern }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.band, curve && styles.curve, { paddingTop: insets.top + 10 }]}>
      {pattern}
      <View style={styles.titleRow}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.iconBtn}>
            <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M15 19l-7-7 7-7" stroke="#fff" strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

export function Screen({ children, scroll = true, onRefresh }) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [kb, setKb] = useState(0); // keyboard height (Android edge-to-edge doesn't resize the window)

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKb(e.endCoordinates?.height || 0));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKb(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try { await onRefresh(); } catch {} finally { setRefreshing(false); }
  };

  // Bottom padding clears the system nav bar (insets.bottom) and, on Android,
  // lifts content above the keyboard so the focused field can scroll into view.
  const bottomPad = 28 + insets.bottom + (Platform.OS === 'android' ? kb : 0);

  if (!scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, paddingBottom: insets.bottom + (Platform.OS === 'android' ? kb : 0) }}>
        {children}
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.red} colors={[colors.red]} progressBackgroundColor="#fff" />
        ) : undefined}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export const Pad = ({ children, style }) => <View style={[{ paddingHorizontal: 18 }, style]}>{children}</View>;

export function IconCircle({ children }) {
  return <View style={styles.iconBtn}>{children}</View>;
}

export const Icons = {
  bell: (c = '#fff') => <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round" /></Svg>,
  play: (c = '#fff', s = 18) => <Svg width={s} height={s} viewBox="0 0 24 24"><Path d="M8 5v14l11-7z" fill={c} /></Svg>,
  plus: (c = '#fff') => <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" /></Svg>,
  check: (c = colors.green, s = 16) => <Svg width={s} height={s} viewBox="0 0 24 24"><Path d="M5 12l4 4 10-11" stroke={c} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>,
  fb: (c = '#fff') => <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M22 12C22 6.5 17.5 2 12 2S2 6.5 2 12c0 5 3.7 9.1 8.4 9.9v-7H7.9v-2.9h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6v1.8h2.8l-.5 2.9h-2.3v7C18.3 21.1 22 17 22 12z" fill={c} /></Svg>,
  wa: (c = '#fff') => <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M12 2a10 10 0 00-8.6 15l-1.4 5 5.1-1.3A10 10 0 1012 2z" fill={c} /></Svg>,
  youtube: (s = 20) => (
    <View style={{ width: s + 8, height: s, backgroundColor: colors.yt, borderRadius: 5, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={s - 7} height={s - 7} viewBox="0 0 24 24"><Path d="M8 5v14l11-7z" fill="#fff" /></Svg>
    </View>
  ),
};

const styles = StyleSheet.create({
  band: { backgroundColor: colors.navy, overflow: 'hidden' },
  curve: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 18, paddingBottom: 16, paddingTop: 4 },
  title: { color: '#fff', fontWeight: '800', fontSize: 21, letterSpacing: -0.4 },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 1 },
  iconBtn: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
});
