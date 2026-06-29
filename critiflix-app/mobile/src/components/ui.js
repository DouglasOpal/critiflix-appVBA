import React from 'react';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, radius, shadow } from '../theme/tokens';

export function Button({ title, onPress, variant = 'red', icon, style, disabled }) {
  const bg = { red: colors.red, navy: colors.navy, yt: colors.yt, wa: colors.wa, ghost: colors.white }[variant];
  const fg = variant === 'ghost' ? colors.navy : colors.white;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.9 : 1 },
        variant === 'ghost' && { borderWidth: 1.5, borderColor: colors.line },
        (variant === 'red' || variant === 'yt') && shadow.red,
        style,
      ]}
    >
      {icon}
      <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, shadow.card, style]}>{children}</View>;
}

export function Chip({ label, tone = 'default', style }) {
  const map = {
    default: [colors.paper2, colors.mist],
    red: [colors.redSoft, colors.red],
    navy: [colors.navy, colors.white],
    green: [colors.greenSoft, colors.green],
    gold: [colors.paper2, colors.gold || colors.mist],
  };
  const [bg, fg] = map[tone] || map.default;
  return (
    <View style={[styles.chip, { backgroundColor: bg }, style]}>
      <Text style={{ color: fg, fontSize: 11, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

export function Eyebrow({ children, tone = 'red' }) {
  const c = tone === 'red' ? colors.red : colors.mist2;
  return (
    <View style={styles.eyebrow}>
      <Ticket small color={c} />
      <Text style={{ color: c, fontWeight: '700', fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' }}>
        {children}
      </Text>
    </View>
  );
}

// Cinema-ticket stub (signature element) — perforated edges.
export function Ticket({ children, small, color = colors.red, style }) {
  if (small) {
    return (
      <View style={{ width: 16, height: 10, borderRadius: 2, backgroundColor: color, justifyContent: 'center' }}>
        <View style={{ position: 'absolute', left: -1.6, width: 3.4, height: 3.4, borderRadius: 2, backgroundColor: colors.paper, top: 3.3 }} />
        <View style={{ position: 'absolute', right: -1.6, width: 3.4, height: 3.4, borderRadius: 2, backgroundColor: colors.paper, top: 3.3 }} />
      </View>
    );
  }
  return (
    <View style={[styles.ticket, { backgroundColor: color }, style]}>
      <View style={[styles.notch, { left: -9 }]} />
      <View style={[styles.notch, { right: -9 }]} />
      {children}
    </View>
  );
}

export function Stars({ value = 0, size = 15, max = 5 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < value;
        return (
          <Svg key={i} width={size} height={size} viewBox="0 0 24 24">
            <Path
              d="M12 2l3 6.5 7 .9-5 4.8 1.3 7L12 18l-6.6 3.2L6.7 14l-5-4.8 7-.9z"
              fill={filled ? colors.red : 'none'}
              stroke={filled ? colors.red : '#CDD6E6'}
              strokeWidth={filled ? 0 : 1.5}
            />
          </Svg>
        );
      })}
    </View>
  );
}

export function Avatar({ label, color = colors.navy, size = 34 }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.4 }}>{label}</Text>
    </View>
  );
}

export function Bar({ pct = 0, color = colors.red, height = 7 }) {
  return (
    <View style={{ height, borderRadius: height, backgroundColor: colors.paper2, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}

export const Score = ({ value, suffix = '/10', size = 30, color = colors.navyInk }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
    <Text style={{ fontSize: size, fontWeight: '800', color, letterSpacing: -1 }}>{value}</Text>
    <Text style={{ fontSize: size * 0.45, fontWeight: '600', color: colors.mist2, marginBottom: size * 0.08 }}>{suffix}</Text>
  </View>
);

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: radius.md },
  btnText: { fontWeight: '700', fontSize: 14 },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, alignSelf: 'flex-start' },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ticket: { borderRadius: radius.lg, padding: 18, overflow: 'visible' },
  notch: { position: 'absolute', top: '50%', marginTop: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.paper },
});
