import { Platform, StyleSheet } from 'react-native';

export const COLORS = {
  primary:      '#1a237e',
  primaryMid:   '#283593',
  primaryLight: '#3949ab',
  primaryBg:    '#e8eaf6',
  accent:       '#ff6f00',
  accentLight:  '#fff3e0',
  green:        '#2e7d32',
  greenLight:   '#e8f5e9',
  greenMid:     '#43a047',
  white:        '#ffffff',
  background:   '#f5f6fa',
  cardBg:       '#ffffff',
  surface:      '#f0f2ff',
  textPrimary:  '#1a237e',
  textDark:     '#0d0d0d',
  textSecondary:'#546e7a',
  textMuted:    '#90a4ae',
  textInverse:  '#ffffff',
  success:      '#2e7d32',
  successLight: '#e8f5e9',
  warning:      '#f57f17',
  warningLight: '#fff8e1',
  error:        '#c62828',
  errorLight:   '#ffebee',
  locked:       '#b0bec5',
  border:       '#e0e0e0',
  divider:      '#eeeeee',
  navActive:    '#1a237e',
  navInactive:  '#90a4ae',
};

export const SPACING = { xs:4, sm:8, md:16, lg:24, xl:32, xxl:48 };

export const RADIUS = { sm:6, md:10, lg:16, xl:24, full:999 };

export const SHADOWS = Platform.select({
  ios: {
    sm: { shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.08, shadowRadius:4, elevation:0 },
    md: { shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.12, shadowRadius:8, elevation:0 },
    lg: { shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.15, shadowRadius:16, elevation:0 },
  },
  android: {
    sm: { elevation:2 },
    md: { elevation:4 },
    lg: { elevation:8 },
  },
  default: {
    sm: { shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.08, shadowRadius:4, elevation:2 },
    md: { shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.12, shadowRadius:8, elevation:4 },
    lg: { shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.15, shadowRadius:16, elevation:8 },
  },
})!;
