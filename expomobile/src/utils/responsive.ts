import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const baseWidth = 375;

export function scaleSize(size: number): number {
  const scale = SCREEN_WIDTH / baseWidth;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

export function isTablet(): boolean {
  return SCREEN_WIDTH >= 768;
}

export function isLandscape(): boolean {
  return SCREEN_WIDTH > SCREEN_HEIGHT;
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32
};

export const Typography = {
  fontFamily: 'Open Sans'
};

// BioSync Color Palette (Off-white canvas, obsidian dark panels, lime green & warm orange accents)
export const Colors = {
  background: '#F4F5F7',
  card: '#FFFFFF',
  cardDark: '#121214',
  cardBorder: '#E4E4E7',
  cardDarkBorder: '#27272A',
  primary: '#18181B',
  primaryDark: '#09090B',
  accent: '#22C55E',
  accentLight: '#DCFCE7',
  orangeAccent: '#F97316',
  orangeLight: '#FFEDD5',
  danger: '#EF4444',
  warning: '#F59E0B',
  textPrimary: '#09090B',
  textDarkPrimary: '#FFFFFF',
  textSecondary: '#52525B',
  textMuted: '#71717A'
};
