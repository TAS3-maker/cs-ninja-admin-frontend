import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, ShoppingCart, Play, Sparkles, RefreshCw } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { CATEGORIES } from '../data/mockData';
import { useCourses } from '../context/CoursesContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../utils/theme';
import { BottomNav } from '../components/BottomNav';
import { Avatar } from '../components/Avatar';
import { isTablet, rs, rf, contentMaxWidth, contentPadH, gridCols } from '../utils/responsive';
import { computeCourseProgress } from '../utils/progress';

interface Props {
  onCoursePress: (id: string) => void;
  onProfilePress?: () => void;
  onTabChange?: (tab: string) => void;
  onViewAllCourses?: () => void;
  onWatchDemo?: () => void;
  onNotifications?: () => void;
  onCart?: () => void;
}

const CourseCard: React.FC<{ course: any; onPress: () => void; enrolled?: boolean; progress?: number }> = ({ course, onPress, enrolled, progress = 0 }) => {
  const cardW = isTablet ? (contentMaxWidth - contentPadH * 2 - 14) / 2 : rs(230);
  // Defensive accessors — admin-created or migrated courses may lack `tags`,
  // `faculty`, `originalPrice`, etc.
  const category = String(course?.category || 'CR').toUpperCase();
  const tagLine = Array.isArray(course?.tags) && course.tags.length
    ? course.tags.slice(0, 2).join(' • ')
    : [course?.language, course?.level].filter(Boolean).join(' • ') || 'Self-paced course';
  const facultyName = course?.faculty?.name
    || course?.faculty_name
    || (Array.isArray(course?.faculty_ids) && course.faculty_ids[0])
    || 'Faculty';
  const price = Number(course?.price) || 0;
  const orig = Number(course?.originalPrice) || price;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[styles.courseCard, { width: cardW }]}>
      <LinearGradient colors={['#1a237e','#283593']} style={styles.cardBanner}>
        <View style={styles.cardTagWrap}>
          <Text style={styles.cardTag}>June 2026 Attempt</Text>
        </View>
        <Text style={styles.cardCategory}>{category}</Text>
        <Text style={styles.cardSub}>{tagLine}</Text>
        <View style={styles.cardFacultyRow}>
          <Avatar name={facultyName} size={rs(32)} borderColor="#fff" />
        </View>
      </LinearGradient>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{course?.title || 'Course'}</Text>
        <Text style={styles.cardMeta}>{[course?.language, course?.level].filter(Boolean).join(' · ') || ' '}</Text>
        {enrolled ? (
          <>
            <View style={styles.progressBar}><View style={[styles.progressFill,{width:`${progress}%` as any}]}/></View>
            <Text style={styles.progressText}>{progress}% complete</Text>
          </>
        ) : (
          <View style={{flexDirection:'row',alignItems:'center',gap:rs(8),marginTop:rs(6)}}>
            <Text style={styles.price}>₹{price.toLocaleString()}</Text>
            {orig > price ? <Text style={styles.strikePrice}>₹{orig.toLocaleString()}</Text> : null}
          </View>
        )}
        <TouchableOpacity style={styles.enrollBtn} onPress={onPress} activeOpacity={0.85}>
          {enrolled ? (
            <View style={{flexDirection:'row',alignItems:'center',gap:rs(6)}}>
              <Play size={rf(13)} color="#fff" strokeWidth={2} fill="#fff" />
              <Text style={styles.enrollBtnText}>Resume</Text>
            </View>
          ) : (
            <Text style={styles.enrollBtnText}>Enroll Now</Text>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export const DashboardScreen: React.FC<Props> = ({ onCoursePress, onTabChange, onViewAllCourses, onWatchDemo, onNotifications, onCart }) => {
  const { user, refresh: refreshUser } = useAuth();
  const { progress, refresh: refreshProgress } = useProgress();
  const { courses: COURSES, refresh: refreshCourses } = useCourses();
  const getCourseProgress = (courseId: string) => {
    const c = COURSES.find((x: any) => x.id === courseId);
    return computeCourseProgress(c, progress.completedSteps);
  };
  const [activeTab, setActiveTab] = useState('home');
  const [selectedCat, setSelectedCat] = useState<string|null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const enrolledCourses = COURSES.filter(c => user?.enrolledCourses.includes(c.id));
  const allCourses = COURSES.filter(c => !selectedCat || c.category === selectedCat);

  const handleTabChange = (tab: string) => {
    if (onTabChange) { onTabChange(tab); return; }
    setActiveTab(tab);
  };

  // Pull-to-refresh + manual refresh button — re-fetches user, courses, progress
  // so the screen reflects newly purchased courses, profile edits, etc.
  const refreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshUser?.(),
        refreshCourses?.(),
        refreshProgress?.(),
      ]);
    } finally { setRefreshing(false); }
  };

  return (
    <SafeAreaView style={{flex:1,backgroundColor:COLORS.background}} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={COLORS.primary} />
        }
      >
        <View style={{maxWidth:contentMaxWidth, alignSelf:'center', width:'100%'}}>

          {/* Top Bar */}
          <View style={styles.topBar}>
            <Image source={require('../../assets/images/csninja-logo.png')} style={{width:rs(54),height:rs(54)}} resizeMode="contain" />
            <View style={{flexDirection:'row',gap:rs(10)}}>
              <TouchableOpacity style={styles.iconBtn} onPress={refreshAll} disabled={refreshing}>
                {refreshing
                  ? <ActivityIndicator size="small" color={COLORS.primary} />
                  : <RefreshCw size={rs(18)} color="#546e7a" strokeWidth={1.8}/>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={onNotifications}><Bell size={rs(18)} color="#546e7a" strokeWidth={1.8}/></TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={onCart}>
                <ShoppingCart size={rs(18)} color="#546e7a" strokeWidth={1.8}/>
                {(user?.cart_items?.length || 0) > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeTxt}>{user.cart_items.length > 9 ? '9+' : user.cart_items.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero Banner */}
          <LinearGradient colors={['#0d1b4b','#1a237e','#1565c0']} style={styles.hero}>
            <View style={styles.heroBadge}>
              <View style={styles.heroDot}/>
              <Text style={{color:'#fff',fontSize:rf(12),fontWeight:'700'}}>BATCHES NOW OPEN</Text>
            </View>
            <Text style={styles.heroTitle}>Clear CS with{'\n'}<Text style={{color:'#7eb8ff',fontStyle:'italic'}}>Practical Understanding</Text></Text>
            <Text style={styles.heroDesc}>Expert-led coaching for CSEET, CS Executive & CS Professional — structured and result-oriented.</Text>
            <View style={{flexDirection:'row',gap:rs(10),marginTop:rs(14),flexWrap:'wrap'}}>
              <TouchableOpacity style={styles.heroBtnPrimary} onPress={() => onViewAllCourses && onViewAllCourses()}>
                <Text style={{color:'#fff',fontWeight:'800',fontSize:rf(13)}}>View All Courses</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroBtnSecondary} onPress={() => onWatchDemo && onWatchDemo()}>
                <Text style={{color:'#fff',fontWeight:'700',fontSize:rf(13)}}>Watch Free Demo</Text>
              </TouchableOpacity>
            </View>
            <View style={{flexDirection:'row',gap:rs(24),marginTop:rs(16)}}>
              <View><Text style={{color:'#fff',fontSize:rf(20),fontWeight:'900'}}>3</Text><Text style={{color:'rgba(255,255,255,0.65)',fontSize:rf(11)}}>CS Levels</Text></View>
              <View style={{width:1,backgroundColor:'rgba(255,255,255,0.2)'}}/> 
              <View><Text style={{color:'#fff',fontSize:rf(20),fontWeight:'900'}}>12+</Text><Text style={{color:'rgba(255,255,255,0.65)',fontSize:rf(11)}}>Faculty Members</Text></View>
            </View>
          </LinearGradient>

          {/* Continue Learning */}
          {enrolledCourses.length > 0 && (
            <View style={{paddingHorizontal:contentPadH, marginTop:SPACING.lg}}>
              <Text style={styles.sectionTitle}>Continue Learning</Text>
              {enrolledCourses.map(c => {
                const pct = computeCourseProgress(c, progress.completedSteps);
                return (
                <TouchableOpacity key={c.id} onPress={() => onCoursePress(c.id)} style={styles.resumeCard}>
                  <LinearGradient colors={['#1a237e','#3949ab']} style={styles.resumeIcon}>
                    <Avatar name={c.faculty.name} size={rs(48)} bgColor="rgba(255,255,255,0.18)" />
                  </LinearGradient>
                  <View style={{flex:1}}>
                    <Text style={{fontSize:rf(13),fontWeight:'800',color:'#0d0d0d'}} numberOfLines={1}>{c.title}</Text>
                    <Text style={{fontSize:rf(11),color:'#90a4ae',marginBottom:rs(6)}}>{c.faculty.name}</Text>
                    <View style={styles.progressBar}><View style={[styles.progressFill,{width:`${pct}%` as any}]}/></View>
                    <Text style={{fontSize:rf(11),color:'#90a4ae'}}>{pct}% Complete</Text>
                  </View>
                  <View style={styles.resumePlayBtn}>
                    <Play size={rf(16)} color="#fff" strokeWidth={2} fill="#fff" />
                  </View>
                </TouchableOpacity>
              );})}
            </View>
          )}

          {/* Our Courses */}
          <View style={[styles.coursesSection,{paddingHorizontal:contentPadH}]}>
            <Text style={styles.coursesMeta}>— OUR COURSES</Text>
            <Text style={styles.coursesTitle}>Featured CS Courses</Text>
            <Text style={styles.coursesDesc}>From foundation to final level — exam-oriented courses for every stage of your CS journey.</Text>

            {/* Category chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:rs(8),paddingVertical:rs(10)}}>
              {[{id:null,label:'All',icon:null},...CATEGORIES].map((cat:any) => (
                <TouchableOpacity key={String(cat.id)} onPress={() => setSelectedCat(cat.id)}
                  style={[styles.chip, selectedCat===cat.id && styles.chipActive, {flexDirection:'row',alignItems:'center',gap:rs(4)}]}>
                  {!cat.id && <Sparkles size={rf(13)} color={selectedCat===cat.id?'#fff':COLORS.primary} strokeWidth={2} />}
                  <Text style={{fontSize:rf(13),fontWeight:'700',color:selectedCat===cat.id?'#fff':'#546e7a'}}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Course cards — horizontal scroll on phone, wrap on tablet */}
            {isTablet ? (
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:rs(14)}}>
                {allCourses.map(c => (
                  <CourseCard key={c.id} course={c} onPress={()=>onCoursePress(c.id)}
                    enrolled={user?.enrolledCourses.includes(c.id)} progress={getCourseProgress(c.id)}/>
                ))}
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:rs(14),paddingBottom:rs(4)}}>
                {allCourses.map(c => (
                  <CourseCard key={c.id} course={c} onPress={()=>onCoursePress(c.id)}
                    enrolled={user?.enrolledCourses.includes(c.id)} progress={getCourseProgress(c.id)}/>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Expert Faculty */}
          <View style={{paddingHorizontal:contentPadH, marginBottom:rs(32)}}>
            <Text style={styles.sectionTitle}>Our Expert Faculty</Text>
            <View style={{flexDirection:'row',flexWrap:'wrap',gap:rs(12)}}>
              {[
                {name:'Adv. Kusum Kapuria',sub:'Business Laws'},
                {name:'Adv. Pawandeep Kaur',sub:'Company Law'},
                {name:'Ms. Shrishti Bhatia',sub:'Economics'},
                {name:'CA Rohit Mehta',sub:'Tax Laws'},
              ].map((f,i) => (
                <View key={i} style={[styles.facultyCard,{width:(contentMaxWidth-contentPadH*2-(gridCols-1)*rs(12))/gridCols}]}>
                  <Avatar name={f.name} size={rs(64)} />
                  <Text style={[styles.facultyName,{marginTop:rs(8)}]} numberOfLines={1}>{f.name}</Text>
                  <Text style={styles.facultySub}>{f.sub}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
      <BottomNav active={activeTab} onChange={handleTabChange}/>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  topBar: {
    flexDirection:'row', justifyContent:'space-between', alignItems:'center',
    paddingHorizontal:contentPadH, paddingVertical:rs(10),
    backgroundColor:'#fff', borderBottomWidth:StyleSheet.hairlineWidth, borderBottomColor:'#e0e0e0',
  },
  logo: {fontSize:rf(22),fontWeight:'900',color:COLORS.primary,letterSpacing:1},
  logoSub: {fontSize:rf(9),color:'#90a4ae',letterSpacing:2,fontWeight:'600'},
  iconBtn: {
    width:rs(38),height:rs(38),borderRadius:rs(19),
    backgroundColor:'#f5f6fa',alignItems:'center',justifyContent:'center',
    borderWidth:1,borderColor:'#e0e0e0',
  },
  cartBadge: {
    position: 'absolute', top: -2, right: -2, minWidth: rs(16), height: rs(16),
    borderRadius: rs(8), backgroundColor: '#e53935', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: rs(4), borderWidth: 1.5, borderColor: '#fff',
  },
  cartBadgeTxt: { color: '#fff', fontSize: rf(9), fontWeight: '900' },
  hero: {padding:contentPadH,paddingVertical:rs(28)},
  heroBadge: {
    flexDirection:'row',alignItems:'center',gap:rs(6),
    backgroundColor:'rgba(255,255,255,0.1)',alignSelf:'flex-start',
    borderRadius:RADIUS.full,paddingHorizontal:rs(12),paddingVertical:rs(5),
    marginBottom:rs(12),borderWidth:1,borderColor:'rgba(255,255,255,0.2)',
  },
  heroDot: {width:rs(6),height:rs(6),borderRadius:rs(3),backgroundColor:'#4caf50'},
  heroTitle: {fontSize:rf(24),fontWeight:'900',color:'#fff',lineHeight:rf(32),marginBottom:rs(10)},
  heroDesc: {fontSize:rf(13),color:'rgba(255,255,255,0.75)',lineHeight:rf(20)},
  heroBtnPrimary: {
    backgroundColor:COLORS.primary,borderRadius:RADIUS.sm,
    paddingHorizontal:rs(16),paddingVertical:rs(10),
    borderWidth:1,borderColor:'rgba(255,255,255,0.3)',
  },
  heroBtnSecondary: {
    borderWidth:1.5,borderColor:'rgba(255,255,255,0.5)',
    borderRadius:RADIUS.sm,paddingHorizontal:rs(16),paddingVertical:rs(10),
  },
  sectionTitle: {fontSize:rf(18),fontWeight:'900',color:'#0d0d0d',marginBottom:rs(12)},
  resumeCard: {
    flexDirection:'row',alignItems:'center',backgroundColor:'#fff',
    borderRadius:RADIUS.lg,padding:rs(12),gap:rs(12),...SHADOWS.sm,
    marginBottom:rs(10),borderWidth:1,borderColor:'#f0f0f0',
  },
  resumeIcon: {width:rs(56),height:rs(56),borderRadius:rs(12),alignItems:'center',justifyContent:'center'},
  resumePlayBtn: {
    width:rs(36),height:rs(36),borderRadius:rs(18),
    backgroundColor:COLORS.primary,alignItems:'center',justifyContent:'center',
  },
  coursesSection: {backgroundColor:'#fff',paddingVertical:rs(16),marginBottom:rs(8)},
  coursesMeta: {fontSize:rf(11),fontWeight:'800',color:COLORS.primary,letterSpacing:1.5,marginBottom:rs(4)},
  coursesTitle: {fontSize:rf(20),fontWeight:'900',color:'#0d0d0d',marginBottom:rs(6)},
  coursesDesc: {fontSize:rf(13),color:'#546e7a',lineHeight:rf(20)},
  chip: {
    backgroundColor:'#f5f6fa',borderRadius:RADIUS.full,
    paddingHorizontal:rs(14),paddingVertical:rs(8),
    borderWidth:1.5,borderColor:'#e0e0e0',
  },
  chipActive: {backgroundColor:COLORS.primary,borderColor:COLORS.primary},
  courseCard: {backgroundColor:'#fff',borderRadius:RADIUS.lg,overflow:'hidden',...SHADOWS.md},
  cardBanner: {height:rs(130),padding:rs(12),justifyContent:'center',position:'relative'},
  cardTagWrap: {},
  cardTag: {
    fontSize:rf(10),fontWeight:'700',color:'#ffcc02',
    backgroundColor:'rgba(255,204,2,0.15)',borderRadius:RADIUS.full,
    paddingHorizontal:rs(8),paddingVertical:rs(2),alignSelf:'flex-start',marginBottom:rs(6),
  },
  cardCategory: {fontSize:rf(22),fontWeight:'900',color:'#fff',letterSpacing:1},
  cardSub: {fontSize:rf(11),color:'rgba(255,255,255,0.75)',marginTop:rs(2)},
  cardFacultyRow: {position:'absolute',bottom:rs(8),right:rs(8),flexDirection:'row'},
  cardFacultyCircle: {
    width:rs(32),height:rs(32),borderRadius:rs(16),
    backgroundColor:'rgba(255,255,255,0.2)',
    alignItems:'center',justifyContent:'center',
    borderWidth:2,borderColor:'#fff',
  },
  cardBody: {padding:rs(12)},
  cardTitle: {fontSize:rf(13),fontWeight:'800',color:'#0d0d0d',lineHeight:rf(18),marginBottom:rs(4)},
  cardMeta: {fontSize:rf(11),color:'#90a4ae'},
  price: {fontSize:rf(16),fontWeight:'900',color:COLORS.primary},
  strikePrice: {fontSize:rf(12),color:'#90a4ae',textDecorationLine:'line-through'},
  progressBar: {height:rs(4),backgroundColor:'#e0e0e0',borderRadius:rs(2),overflow:'hidden',marginTop:rs(8),marginBottom:rs(3)},
  progressFill: {height:'100%',backgroundColor:COLORS.green,borderRadius:rs(2)},
  progressText: {fontSize:rf(11),color:'#90a4ae'},
  enrollBtn: {backgroundColor:COLORS.primary,borderRadius:RADIUS.sm,paddingVertical:rs(9),alignItems:'center',marginTop:rs(10)},
  enrollBtnText: {color:'#fff',fontSize:rf(13),fontWeight:'800',letterSpacing:0.3},
  facultyCard: {backgroundColor:'#fff',borderRadius:RADIUS.lg,padding:rs(12),alignItems:'center',...SHADOWS.sm,borderWidth:1,borderColor:'#f0f0f0'},
  facultyAvatarBox: {width:rs(64),height:rs(64),borderRadius:rs(32),alignItems:'center',justifyContent:'center',marginBottom:rs(8)},
  facultyName: {fontSize:rf(12),fontWeight:'800',color:'#0d0d0d',textAlign:'center'},
  facultySub: {fontSize:rf(11),color:'#546e7a',textAlign:'center',marginTop:rs(2)},
});
