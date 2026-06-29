import React from 'react';
import { View } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { colors } from '../theme/tokens';

// Exact vector from the supplied logo pack (Critiflix_Icon.svg), viewBox 1080.
const BLADES = [
  'm693.7 641.63 75.86 167.48c-21.02 14.78-56.13 35.58-103.94 47.37-54.88 13.54-101.2 8.96-127.79 4.3 51.96-73.05 103.91-146.1 155.87-219.16Z',
  'm595.43 680.99-83.65 163.74c-24.66-7.22-62.82-21.7-101.84-51.72-44.8-34.46-70.11-73.53-83.04-97.23 89.51-4.93 179.02-9.85 268.52-14.78Z',
  'm503.39 628.7-180.17 36.69c-9.73-23.78-22.2-62.64-23.06-111.87-.99-56.51 13.78-100.66 24.24-125.54 59.66 66.91 119.32 133.82 178.98 200.73Z',
  'm486.88 524.13-141.02-117.98c12.53-22.44 35.14-56.41 73.09-87.78 43.57-36.01 87.29-51.98 113.27-59.32-15.11 88.36-30.23 176.72-45.34 265.08Z',
  'm558.34 446.03 4.32-183.81c25.35-4.19 66.01-7.7 114.2 2.41 55.32 11.61 95.07 35.83 117 51.57-78.51 43.28-157.01 86.55-235.52 129.83Z',
];
const FRAME =
  'm958.36 1008.77H135.63c-19.69 0-35.64-15.96-35.64-35.64V150.4c0-19.69 15.96-35.65 35.65-35.65h822.73c19.69 0 35.64 15.96 35.64 35.64v822.73c0 19.69-15.96 35.64-35.64 35.64ZM135.63 150.16c-.13 0-.24.11-.24.24v822.73c0 .13.11.24.24.24h822.73c.13 0 .24-.11.24-.24V150.4c0-.13-.11-.24-.24-.24H135.63Z';

export default function Logo({ size = 32, color = colors.red, frame = true }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1080 1080">
      <G fill={color}>
        {BLADES.map((d, i) => <Path key={i} d={d} />)}
        {frame ? <Path d={FRAME} /> : null}
      </G>
    </Svg>
  );
}

// Faint repeating shutter texture for navy hero panels.
export function BrandPattern({ opacity = 0.05, tile = 90 }) {
  const cols = 5, rows = 8;
  return (
    <View style={{ position: 'absolute', inset: 0, opacity, flexDirection: 'row', flexWrap: 'wrap' }} pointerEvents="none">
      {Array.from({ length: cols * rows }).map((_, i) => (
        <View key={i} style={{ width: tile, height: tile, alignItems: 'center', justifyContent: 'center' }}>
          <Logo size={tile * 0.62} color="#FFFFFF" frame={false} />
        </View>
      ))}
    </View>
  );
}
