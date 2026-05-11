import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Home, BookOpen, MessageCircle, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../utils/theme';
import { isTablet, rf, rs } from '../utils/responsive';

interface Props {
  active: string;
  onChange: (tab: string) => void;
}

const TABS = [
  { id: 'home',    label: 'Home',    Icon: Home },
  { id: 'notes',   label: 'Notes',   Icon: BookOpen },
  { id: 'doubt',   label: 'Doubts',  Icon: MessageCircle },
  { id: 'profile', label: 'Profile', Icon: User },
];

export const BottomNav: React.FC<Props> = ({ active, onChange }) => {
  const insets = useSafeAreaInsets();
  const iconSize = isTablet ? 26 : 22;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <TouchableOpacity
            key={id}
            onPress={() => onChange(id)}
            style={styles.tab}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <Icon
                size={iconSize}
                color={isActive ? COLORS.primary : '#90a4ae'}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#dde1ea',
    paddingTop: 8,
    // Android elevation
    elevation: 8,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: rs(3),
    minHeight: rs(44), // minimum tap target
    justifyContent: 'center',
  },
  iconWrap: {
    width: rs(44),
    height: rs(28),
    borderRadius: rs(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: '#e8eaf6',
  },
  label: {
    fontSize: rf(11),
    color: '#90a4ae',
    fontWeight: '500',
  },
  labelActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
});
