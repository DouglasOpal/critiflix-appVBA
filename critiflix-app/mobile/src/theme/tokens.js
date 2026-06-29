// CritiFlix design tokens — mirror of the approved web design (red / navy / white).
export const colors = {
  navy: '#13294B', navy2: '#1C3A66', navyInk: '#0B1A33',
  red: '#E50914', redDeep: '#B00710', redSoft: '#FDE8E9',
  yt: '#FF0000', wa: '#25D366', fb: '#1877F2',
  white: '#FFFFFF', paper: '#F3F6FC', paper2: '#E9EEF7',
  line: '#E1E7F2',
  text: '#0F1E38', mist: '#5B6B86', mist2: '#94A1B8',
  green: '#159E68', greenSoft: '#E6F6EF', gold: '#E0A21A',
};
export const radius = { sm: 11, md: 14, lg: 18, xl: 24, pill: 999 };
export const space = (n) => n * 4;
export const shadow = {
  card: { shadowColor: '#0F1E38', shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 3 },
  red: { shadowColor: '#E50914', shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
};
