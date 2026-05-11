import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';

interface Props {
  name: string;
  uri?: string | null;       // optional image source (CloudFront / data uri)
  size?: number;
  bgColor?: string;
  textColor?: string;
  style?: ViewStyle;
  borderColor?: string;
}

const PALETTE = [
  '#1a237e', '#283593', '#3949ab', '#5e35b1', '#00838f',
  '#ad1457', '#c62828', '#ef6c00', '#2e7d32', '#0277bd',
];

const colorFromName = (name: string): string => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
};

const initialsFromName = (name: string): string => {
  const parts = name.replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const Avatar: React.FC<Props> = ({ name, uri, size = 40, bgColor, textColor = '#fff', borderColor, style }) => {
  const bg = bgColor || colorFromName(name);
  const initials = initialsFromName(name);
  const baseStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: bg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...(borderColor ? { borderWidth: 2, borderColor } : {}),
  };

  if (uri) {
    return (
      <View style={[baseStyle, style]}>
        <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View style={[baseStyle, style]}>
      <Text style={{ color: textColor, fontWeight: '800', fontSize: size * 0.4, letterSpacing: 0.5 }}>
        {initials}
      </Text>
    </View>
  );
};
