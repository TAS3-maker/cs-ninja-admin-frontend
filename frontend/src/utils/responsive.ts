import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Device type detection
export const isTablet = SCREEN_W >= 768;
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

// Base design width (iPhone 14 Pro = 393pt)
const BASE_W = 393;

// Scale a size proportionally to screen width, capped for tablets
export const rs = (size: number): number => {
  const scale = SCREEN_W / BASE_W;
  const capped = isTablet ? Math.min(scale, 1.4) : scale;
  return Math.round(PixelRatio.roundToNearestPixel(size * capped));
};

// Font scale — more conservative than layout scale
export const rf = (size: number): number => {
  const scale = SCREEN_W / BASE_W;
  const capped = isTablet ? Math.min(scale, 1.25) : scale;
  return Math.round(PixelRatio.roundToNearestPixel(size * capped));
};

// Tablet column count for grids
export const gridCols = isTablet ? 3 : 2;

// Safe bottom padding (Android has no notch)
export const safeBottom = isIOS ? 0 : 0; // SafeAreaView handles this

// Status bar height
export const statusBarHeight = Platform.select({ android: 24, ios: 0, default: 0 });

// Screen dimensions (live — use inside components if you need dynamic)
export const screenWidth = SCREEN_W;
export const screenHeight = SCREEN_H;

// Tablet-aware content max width (for centering on large screens)
export const contentMaxWidth = isTablet ? Math.min(SCREEN_W, 680) : SCREEN_W;
export const contentPadH = isTablet ? Math.max(24, (SCREEN_W - contentMaxWidth) / 2) : 16;
