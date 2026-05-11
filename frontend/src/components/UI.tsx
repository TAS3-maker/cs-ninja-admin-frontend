import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { Star, Check, Lock, Play, FileText, ClipboardList, BookOpen } from 'lucide-react-native';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../utils/theme';

export const Button: React.FC<{
  title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg'; loading?: boolean; disabled?: boolean; style?: ViewStyle; icon?: React.ReactNode;
}> = ({ title, onPress, variant = 'primary', size = 'md', loading, disabled, style, icon }) => {
  const isDisabled = disabled || loading;
  const bgColor = { primary: COLORS.primary, secondary: COLORS.primaryBg, ghost: 'transparent', danger: COLORS.error }[variant];
  const textColor = { primary: '#fff', secondary: COLORS.primary, ghost: COLORS.primary, danger: '#fff' }[variant];
  const padding = { sm: 10, md: 14, lg: 16 }[size];
  const fontSize = { sm: 13, md: 15, lg: 16 }[size];
  return (
    <TouchableOpacity onPress={onPress} disabled={isDisabled} activeOpacity={0.85}
      style={[{ backgroundColor: bgColor, borderRadius: RADIUS.md, paddingVertical: padding,
        paddingHorizontal: SPACING.lg, alignItems: 'center', justifyContent: 'center',
        flexDirection: 'row', opacity: isDisabled ? 0.6 : 1,
        ...(variant === 'secondary' ? { borderWidth: 1.5, borderColor: COLORS.primary } : {}),
      }, style]}>
      {loading ? <ActivityIndicator size="small" color={textColor} /> : (
        <>{icon && <View style={{ marginRight: 8 }}>{icon}</View>}
          <Text style={{ color: textColor, fontSize, fontWeight: '700' }}>{title}</Text></>
      )}
    </TouchableOpacity>
  );
};

export const Card: React.FC<{ children: React.ReactNode; style?: ViewStyle; onPress?: () => void; noPadding?: boolean }> = ({ children, style, onPress, noPadding }) => {
  const cardStyle = [{ backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, padding: noPadding ? 0 : SPACING.md, ...SHADOWS.sm }, style];
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.92} style={cardStyle}>{children}</TouchableOpacity>;
  return <View style={cardStyle}>{children}</View>;
};

export const Badge: React.FC<{ label: string; color?: string; bgColor?: string; size?: 'sm' | 'md' }> = ({
  label, color = COLORS.primary, bgColor = COLORS.primaryBg, size = 'md',
}) => (
  <View style={{ backgroundColor: bgColor, borderRadius: RADIUS.full, paddingHorizontal: size === 'sm' ? 8 : 12, paddingVertical: size === 'sm' ? 3 : 5, alignSelf: 'flex-start' }}>
    <Text style={{ color, fontSize: size === 'sm' ? 11 : 12, fontWeight: '700' }}>{label}</Text>
  </View>
);

export const ProgressBar: React.FC<{ progress: number; height?: number; showLabel?: boolean; color?: string; style?: ViewStyle }> = ({
  progress, height = 6, showLabel, color = COLORS.primary, style,
}) => (
  <View style={style}>
    {showLabel && (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' }}>Progress</Text>
        <Text style={{ fontSize: 12, color, fontWeight: '700' }}>{Math.round(progress)}%</Text>
      </View>
    )}
    <View style={{ height, backgroundColor: COLORS.border, borderRadius: RADIUS.full, overflow: 'hidden' }}>
      <View style={{ height: '100%', width: `${Math.min(100, progress)}%`, backgroundColor: color, borderRadius: RADIUS.full }} />
    </View>
  </View>
);

export const RatingStars: React.FC<{ rating: number; size?: number }> = ({ rating, size = 14 }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {[1,2,3,4,5].map(i => (
      <Star key={i} size={size} color={i <= Math.round(rating) ? '#f57f17' : COLORS.border} fill={i <= Math.round(rating) ? '#f57f17' : 'transparent'} strokeWidth={1.5} />
    ))}
  </View>
);

export const SectionHeader: React.FC<{ title: string; subtitle?: string; action?: { label: string; onPress: () => void }; style?: ViewStyle }> = ({ title, subtitle, action, style }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, style]}>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.textDark, letterSpacing: -0.3 }}>{title}</Text>
      {subtitle && <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>{subtitle}</Text>}
    </View>
    {action && <TouchableOpacity onPress={action.onPress}><Text style={{ fontSize: 13, color: COLORS.primary, fontWeight: '700' }}>{action.label}</Text></TouchableOpacity>}
  </View>
);

export const Chip: React.FC<{ label: string; selected?: boolean; onPress?: () => void; icon?: string }> = ({ label, selected, onPress, icon }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8}
    style={{ backgroundColor: selected ? COLORS.primary : COLORS.cardBg, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: selected ? COLORS.primary : COLORS.border }}>
    {icon && <Text style={{ fontSize: 14 }}>{icon}</Text>}
    <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? '#fff' : COLORS.textSecondary }}>{label}</Text>
  </TouchableOpacity>
);

export const EmptyState: React.FC<{ icon: string; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => (
  <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32 }}>
    <Text style={{ fontSize: 48, marginBottom: 12 }}>{icon}</Text>
    <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.textDark, textAlign: 'center', marginBottom: 8 }}>{title}</Text>
    {subtitle && <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 }}>{subtitle}</Text>}
  </View>
);

export const StepIcon: React.FC<{ type: string; isLocked: boolean; isCompleted: boolean; size?: number }> = ({ type, isLocked, isCompleted, size = 36 }) => {
  const borderColor = isCompleted ? COLORS.success : isLocked ? COLORS.locked : COLORS.primary;
  const bg = isCompleted ? COLORS.successLight : isLocked ? '#f5f6fa' : COLORS.primaryBg;
  const iconColor = borderColor;
  const iconSize = Math.round(size * 0.5);
  let IconCmp: any = BookOpen;
  if (isCompleted) IconCmp = Check;
  else if (isLocked) IconCmp = Lock;
  else if (type === 'video') IconCmp = Play;
  else if (type === 'pdf') IconCmp = FileText;
  else if (type === 'quiz') IconCmp = ClipboardList;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor }}>
      <IconCmp size={iconSize} color={iconColor} strokeWidth={2.2} />
    </View>
  );
};
