import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { rf, rs } from '../utils/responsive';

const { width, height } = Dimensions.get('window');

export const SplashView: React.FC = () => {
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    Animated.timing(textFade, { toValue: 1, duration: 800, delay: 600, useNativeDriver: true }).start();
  }, []);

  return (
    <LinearGradient colors={['#1a237e', '#283593', '#3949ab']} style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.logoWrap}>
          <Image
            source={require('../../assets/images/csninja-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: textFade }]}>
        <Text style={styles.tagline}>Master Your CS Journey</Text>
        <View style={styles.dotsRow}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
        <Text style={styles.copyright}>© CSninja · Powered by Learnova Institute</Text>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', width, height },
  content: { alignItems: 'center', justifyContent: 'center' },
  logoWrap: {
    width: rs(150), height: rs(150), borderRadius: rs(36),
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center', justifyContent: 'center',
    padding: rs(14),
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 30, shadowOffset: { width: 0, height: 20 },
  },
  logo: { width: '100%', height: '100%' },
  footer: { position: 'absolute', bottom: rs(60), alignItems: 'center' },
  tagline: { color: '#fff', fontSize: rf(16), fontWeight: '700', letterSpacing: 0.5, marginBottom: rs(16) },
  dotsRow: { flexDirection: 'row', gap: rs(6), marginBottom: rs(22) },
  dot: { width: rs(6), height: rs(6), borderRadius: rs(3), backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor: '#ffcc02', width: rs(18) },
  copyright: { color: 'rgba(255,255,255,0.5)', fontSize: rf(11), letterSpacing: 0.3 },
});
