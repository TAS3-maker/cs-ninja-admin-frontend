import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, StatusBar, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Star } from 'lucide-react-native';
import { COLORS, RADIUS } from '../utils/theme';
import { rf, rs, contentMaxWidth, contentPadH } from '../utils/responsive';

interface Props { onGetStarted: () => void; onLogin: () => void; }

export const LandingScreen: React.FC<Props> = ({ onGetStarted, onLogin }) => {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue:1, duration:700, useNativeDriver:true }),
      Animated.spring(slideAnim, { toValue:0, tension:50, friction:10, useNativeDriver:true }),
    ]).start();
  }, []);

  const features = ['Structured Learning', 'Expert Faculty', 'Live Classes', 'Mock Tests'];

  return (
    <LinearGradient colors={['#1a237e','#283593','#3949ab']} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a237e" />

      <Animated.View style={[styles.content, { opacity:fadeAnim, transform:[{translateY:slideAnim}], paddingTop: insets.top + rs(20), maxWidth:contentMaxWidth, alignSelf:'center', width:'100%' }]}>
        <View style={styles.logoBox}>
          <Image source={require('../../assets/images/csninja-logo.png')} style={styles.logoImg} resizeMode="contain" />
        </View>
        <View style={styles.divider} />
        <Text style={styles.heroText}>Start your CS preparation</Text>
        <Text style={styles.heroSub}>India's most trusted CS exam preparation platform with expert faculty, live classes and comprehensive test series.</Text>

        {/* Feature chips */}
        <View style={styles.featuresRow}>
          {features.map((f, i) => (
            <View key={i} style={styles.featureChip}>
              <Text style={styles.featureChipText}>{f}</Text>
            </View>
          ))}
        </View>

        <View style={styles.statsRow}>
          {[{val:'50K+',label:'Students'},{val:'200+',label:'Lectures'},{val:'4.9',label:'Rating',isStar:true}].map((s:any,i)=>(
            <View key={i} style={styles.statItem}>
              <View style={{flexDirection:'row',alignItems:'center',gap:rs(2)}}>
                <Text style={styles.statVal}>{s.val}</Text>
                {s.isStar && <Star size={rf(14)} color="#ffcc02" fill="#ffcc02" strokeWidth={0} />}
              </View>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View style={[styles.bottomSection, { opacity:fadeAnim, paddingBottom: insets.bottom + rs(20), maxWidth:contentMaxWidth, alignSelf:'center', width:'100%' }]}>
        <TouchableOpacity style={styles.loginBtn} onPress={onLogin} activeOpacity={0.9}>
          <Text style={styles.loginBtnText}>Log In</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.createBtn} onPress={onGetStarted} activeOpacity={0.9}>
          <Text style={styles.createBtnText}>New user? <Text style={{fontWeight:'800', textDecorationLine:'underline'}}>Create account.</Text></Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex:1 },
  content: { flex:1, alignItems:'center', justifyContent:'center', paddingHorizontal:contentPadH },
  logoBox: {
    width:rs(104), height:rs(104), borderRadius:rs(24),
    backgroundColor:'rgba(255,255,255,0.95)',
    alignItems:'center', justifyContent:'center',
    marginBottom:rs(14), padding:rs(8),
  },
  logoImg: { width:'100%', height:'100%' },
  logoEmoji: { fontSize:rs(42) },
  brandName: { fontSize:rf(40), fontWeight:'900', color:'#fff', letterSpacing:2, marginBottom:rs(6) },
  tagline: { fontSize:rf(12), color:'rgba(255,255,255,0.7)', letterSpacing:3, fontWeight:'600', marginBottom:rs(20) },
  divider: { width:rs(60), height:3, backgroundColor:'#ff6f00', borderRadius:2, marginBottom:rs(20) },
  heroText: { fontSize:rf(24), fontWeight:'800', color:'#fff', textAlign:'center', marginBottom:rs(10) },
  heroSub: { fontSize:rf(14), color:'rgba(255,255,255,0.75)', textAlign:'center', lineHeight:rs(22), marginBottom:rs(20), paddingHorizontal:rs(8) },
  featuresRow: { flexDirection:'row', flexWrap:'wrap', gap:rs(8), justifyContent:'center', marginBottom:rs(24) },
  featureChip: {
    backgroundColor:'rgba(255,255,255,0.12)', borderRadius:RADIUS.full,
    paddingHorizontal:rs(14), paddingVertical:rs(7),
    borderWidth:1, borderColor:'rgba(255,255,255,0.2)',
  },
  featureChipText: { fontSize:rf(12), color:'#fff', fontWeight:'600' },
  statsRow: {
    flexDirection:'row', gap:rs(28),
    backgroundColor:'rgba(255,255,255,0.1)', borderRadius:RADIUS.lg,
    paddingVertical:rs(14), paddingHorizontal:rs(24),
    borderWidth:1, borderColor:'rgba(255,255,255,0.2)',
  },
  statItem: { alignItems:'center' },
  statVal: { fontSize:rf(18), fontWeight:'900', color:'#fff' },
  statLabel: { fontSize:rf(11), color:'rgba(255,255,255,0.65)', fontWeight:'500' },
  bottomSection: { paddingHorizontal:contentPadH, gap:rs(12) },
  loginBtn: {
    backgroundColor:'#fff', borderRadius:RADIUS.md,
    paddingVertical:rs(15), alignItems:'center',
  },
  loginBtnText: { fontSize:rf(16), fontWeight:'800', color:COLORS.primary, letterSpacing:0.5 },
  createBtn: { alignItems:'center', paddingVertical:rs(10) },
  createBtnText: { fontSize:rf(14), color:'rgba(255,255,255,0.85)', fontWeight:'400' },
});
