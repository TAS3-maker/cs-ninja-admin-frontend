import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft, BookOpen, Video, CalendarDays, Check, ChevronUp, ChevronDown,
  ClipboardList, Star, Clock, Play, Lock, Library,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { useCourses } from '../context/CoursesContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../utils/theme';
import { computeCourseProgress } from '../utils/progress';
import { getEnrollmentStatus, formatDate } from '../utils/enrollment';
import { StepIcon } from '../components/UI';
import { Avatar } from '../components/Avatar';
import { api } from '../services/api';

interface Props {
  courseId: string;
  onBack: () => void;
  onStartLearning: (courseId: string, chapterId: string, stepId: string) => void;
  onCart?: () => void;
}

export const CourseDetailScreen: React.FC<Props> = ({ courseId, onBack, onStartLearning, onCart }) => {
  const { courses: COURSES } = useCourses();
  const { user, enrollCourse } = useAuth();
  const { progress, isStepCompleted } = useProgress();
  const [activeTab, setActiveTab] = useState<'About' | 'Structure' | 'Batch Info' | 'Faculty'>('About');
  const [expandedModule, setExpandedModule] = useState<string | null>('mod_001');

  const course = COURSES.find(c => c.id === courseId);
  if (!course) return null;

  const getCourseProgress = (cid: string) => {
    const c = COURSES.find((x: any) => x.id === cid);
    return computeCourseProgress(c, progress.completedSteps);
  };

const isEnrolled = user?.enrolledCourses.includes(courseId);
  const enrollStatus = getEnrollmentStatus(user, courseId);

  const facultyList = React.useMemo(() => {
    if (!course) return [];
    if ((course as any).faculties_data?.length > 0) return (course as any).faculties_data;
    return course.faculty ? [course.faculty] : [];
  }, [course]);

  const [adding, setAdding] = useState(false);

  const handleEnroll = async () => {
    if (!user) { Alert.alert('Login required', 'Please log in to buy courses.'); return; }
    setAdding(true);
    try {
      await api.addToCart(courseId);
      Alert.alert(
        'Added to cart',
        `${course.title} has been added to your cart.`,
        [
          { text: 'Continue browsing', style: 'cancel' },
          { text: 'Go to Cart', onPress: () => onCart?.() },
        ],
      );
    } catch (e: any) {
      const msg = e?.message || 'Could not add to cart';
      if (msg.toLowerCase().includes('already enrolled')) {
        Alert.alert('Already Enrolled', 'You already have access to this course.');
      } else {
        Alert.alert('Cart error', msg);
      }
    } finally {
      setAdding(false);
    }
  };

  const tabs = ['About', 'Structure', 'Batch Info', 'Faculty'] as const;

  const infoChips: { Icon: any; label: string }[] = [
    { Icon: BookOpen, label: course.modules.length > 0 ? `${course.modules.length} Modules` : '4 Papers' },
    { Icon: Video, label: 'Live + Recorded' },
    { Icon: CalendarDays, label: '10 Lectures' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ChevronLeft size={20} color="#0d0d0d" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{course.category.toUpperCase()}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#1a237e', '#283593']} style={styles.banner}>
          <View style={styles.bannerInner}>
            <View style={styles.bannerTag}>
              <Text style={{ color: '#ffcc02', fontSize: 11, fontWeight: '800' }}>June 2026 Attempt</Text>
            </View>
            <Text style={styles.bannerTitle}>{course.category.toUpperCase()}</Text>
            <Text style={styles.bannerSub}>{course.tags.join(' • ')}</Text>
          </View>
          <View style={styles.facultyCircles}>
          {course.faculty?.avatar ? (
              <Image source={{ uri: course.faculty.avatar }} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#fff' }} />
            ) : (
              <Avatar name={course.faculty.name} size={40} bgColor="rgba(255,255,255,0.2)" borderColor="#fff" />
            )}
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 6 }}>Expert Faculty</Text>
          </View>
        </LinearGradient>

        <View style={styles.chipRow}>
          {infoChips.map(({ Icon, label }, i) => (
            <View key={i} style={styles.infoChip}>
              <Icon size={13} color="#546e7a" strokeWidth={1.8} />
              <Text style={{ fontSize: 12, color: '#546e7a', fontWeight: '600', marginLeft: 5 }}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Enrollment / expiry banner */}
        {isEnrolled && enrollStatus.hasDates && (
          <View style={[styles.expiryBanner, enrollStatus.expired ? styles.expiryBannerExpired : enrollStatus.daysLeft <= 14 ? styles.expiryBannerWarn : styles.expiryBannerOk]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.expiryTitle, enrollStatus.expired && { color: '#fff' }]}>
                {enrollStatus.expired
                  ? 'Course Access Expired'
                  : enrollStatus.daysLeft <= 14
                    ? `Expires in ${enrollStatus.daysLeft} day${enrollStatus.daysLeft === 1 ? '' : 's'}`
                    : `Active access — ${enrollStatus.daysLeft} days remaining`}
              </Text>
              <Text style={[styles.expirySub, enrollStatus.expired && { color: 'rgba(255,255,255,0.85)' }]}>
                {enrollStatus.expired
                  ? `Expired on ${formatDate(enrollStatus.expiresAt)}. Re-enroll to continue.`
                  : `Valid till ${formatDate(enrollStatus.expiresAt)}`}
              </Text>
            </View>
            {enrollStatus.expired && (
              <TouchableOpacity onPress={handleEnroll} style={styles.reEnrollBtn}>
                <Text style={styles.reEnrollBtnTxt}>Re-enroll</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.packageCard}>
          <View style={styles.packageRow}>
            <View style={styles.radioSelected} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', color: '#0d0d0d' }}>
                Complete {course.category.toUpperCase()} Package  ₹{course.price.toLocaleString()}
              </Text>
            </View>
            <View style={styles.bestValueTag}>
              <Text style={{ color: '#ff6f00', fontSize: 11, fontWeight: '800' }}>BEST VALUE</Text>
            </View>
          </View>
          <Text style={{ fontSize: 13, color: COLORS.green, fontWeight: '700', marginLeft: 28, marginTop: 4 }}>
            Save ₹{(course.originalPrice - course.price).toLocaleString()}
          </Text>
   {(course.books || []).filter((b: any) => b.included).length > 0 && (
            <View style={styles.packageFeature}>
              <View style={{ flex: 1, gap: 4 }}>
                {(course.books || []).filter((b: any) => b.included).map((b: any, i: number) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Library size={14} color="#546e7a" strokeWidth={1.8} />
                    <Text style={{ fontSize: 13, color: '#0d0d0d', flex: 1 }}>{b.title}</Text>
                    <Check size={16} color={COLORS.green} strokeWidth={2.5} />
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.tabBar}>
          {tabs.map(t => (
            <TouchableOpacity key={t} onPress={() => setActiveTab(t)} style={[styles.tab, activeTab === t && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ padding: SPACING.lg }}>
          {activeTab === 'About' && (
            <>
              <View style={styles.coordinatorCard}>
     {course.faculty?.avatar ? (
                  <Image source={{ uri: course.faculty.avatar }} style={{ width: 52, height: 52, borderRadius: 26 }} />
                ) : (
                  <Avatar name={course.faculty.name} size={52} />
                )}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 11, color: '#90a4ae', fontWeight: '600' }}>Course Coordinator</Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0d0d0d' }}>{course.faculty.name}</Text>
                  <Text style={{ fontSize: 12, color: '#546e7a' }}>{course.faculty.subject}</Text>
                </View>
              </View>
              <Text style={styles.sectionTitle}>About this Course</Text>
              <Text style={{ fontSize: 14, color: '#546e7a', lineHeight: 22 }}>{course.description}</Text>
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>What you'll learn</Text>
              {(Array.isArray(course?.highlights) ? course.highlights : []).map((h: any, i: number) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                  <Check size={16} color={COLORS.green} strokeWidth={2.5} style={{ marginTop: 2 }} />
                  <Text style={{ flex: 1, fontSize: 14, color: '#546e7a', lineHeight: 20 }}>{h}</Text>
                </View>
              ))}
            </>
          )}

          {activeTab === 'Structure' && (
            <>
              {course.modules.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <ClipboardList size={48} color="#e0e0e0" strokeWidth={1.5} />
                  <Text style={{ color: '#90a4ae', marginTop: 12, fontSize: 14 }}>Curriculum coming soon</Text>
                </View>
              ) : (
                course.modules.map(mod => (
                  <View key={mod.id} style={{ marginBottom: 12 }}>
                    <TouchableOpacity
                      onPress={() => setExpandedModule(expandedModule === mod.id ? null : mod.id)}
                      style={styles.moduleHeader}>
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: '#0d0d0d' }}>{mod.title}</Text>
                      {expandedModule === mod.id
                        ? <ChevronUp size={18} color="#90a4ae" strokeWidth={2} />
                        : <ChevronDown size={18} color="#90a4ae" strokeWidth={2} />}
                    </TouchableOpacity>
                    {expandedModule === mod.id && mod.chapters.map((ch, ci) => (
                      <View key={ch.id} style={styles.chapterItem}>
                        <View style={styles.chapterHeader}>
                          <View style={[styles.chapterNum, ch.isLocked && { borderColor: '#b0bec5' }]}>
                            {ch.isCompleted
                              ? <Check size={14} color={COLORS.primary} strokeWidth={2.5} />
                              : ch.isLocked
                                ? <Lock size={11} color="#b0bec5" strokeWidth={2.2} />
                                : <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.primary }}>{ci + 1}</Text>}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[{ fontSize: 13, fontWeight: '700', color: '#0d0d0d' }, ch.isLocked && { color: '#90a4ae' }]}>{ch.title}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              <Clock size={11} color="#90a4ae" strokeWidth={1.8} />
                              <Text style={{ fontSize: 12, color: '#90a4ae' }}>{ch.duration} · {ch.steps.length} lessons</Text>
                            </View>
                          </View>
                        </View>
                        {ch.steps.map(step => (
                          <TouchableOpacity key={step.id} disabled={step.isLocked || !isEnrolled}
                            onPress={() => onStartLearning(courseId, ch.id, step.id)}
                            style={[styles.stepRow, step.isLocked && { opacity: 0.5 }]}>
                            <StepIcon type={step.type} isLocked={step.isLocked} isCompleted={isStepCompleted(step.id)} size={28} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12, fontWeight: '600', color: step.isLocked ? '#90a4ae' : '#0d0d0d' }}>{step.title}</Text>
                              {step.type === 'video' && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 }}>
                                  <Play size={9} color="#90a4ae" strokeWidth={2} fill="#90a4ae" />
                                  <Text style={{ fontSize: 11, color: '#90a4ae' }}>{(step as any).duration}</Text>
                                </View>
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ))}
                  </View>
                ))
              )}
            </>
          )}

          {activeTab === 'Batch Info' && (
            <View>
              {[
                { label: 'Duration', val: course.duration || (course.durationDays ? `${course.durationDays} days` : 'Self-paced (lifetime access)') },
                { label: 'Language', val: course.language || 'English' },
                { label: 'Level', val: course.level || 'Beginner' },
                { label: 'Validity', val: course.expiryDate || 'Lifetime access' },
              ].map((r, i) => (
                <View key={i} style={styles.infoRow}>
                  <Text style={{ fontSize: 13, color: '#90a4ae', fontWeight: '600' }}>{r.label}</Text>
                  <Text style={{ fontSize: 13, color: '#0d0d0d', fontWeight: '700' }}>{r.val}</Text>
                </View>
              ))}
            </View>
          )}

  {activeTab === 'Faculty' && (
            <View style={{ gap: 12 }}>
              {facultyList.map((fac: any, idx: number) => (
                <View key={fac.id || idx} style={[styles.coordinatorCard, { alignItems: 'flex-start', marginBottom: 0 }]}>
                  {fac.avatar
                    ? <Image source={{ uri: fac.avatar }} style={{ width: 56, height: 56, borderRadius: 28, flexShrink: 0 }} />
                    : <Avatar name={fac.name || 'F'} size={56} />}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#0d0d0d' }}>{fac.name}</Text>
                      {idx === 0 && (
                        <View style={{ backgroundColor: '#e8eaf6', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.primary }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: COLORS.primary }}>PRIMARY</Text>
                        </View>
                      )}
                    </View>
                    {!!fac.subject && <Text style={{ fontSize: 12, color: '#546e7a', marginTop: 2 }}>{fac.subject}</Text>}
                    {!!fac.bio && <Text style={{ fontSize: 12, color: '#90a4ae', marginTop: 3, lineHeight: 18 }}>{fac.bio}</Text>}
                    {!!fac.rating && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }}>
                        <Star size={12} color="#f57f17" fill="#f57f17" strokeWidth={0} />
                        <Text style={{ fontSize: 12, color: '#90a4ae' }}>
                          {Number(fac.rating).toFixed(1)} · {(Number(fac.students) || 0).toLocaleString()} students
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.buyBar}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.buyPrice}>₹ {course.price.toLocaleString()}</Text>
            <Text style={styles.buyStrike}>₹{course.originalPrice.toLocaleString()}</Text>
            <Text style={{ color: COLORS.green, fontSize: 12, fontWeight: '700' }}>(20% off)</Text>
          </View>
        </View>
        {isEnrolled ? (
          enrollStatus.expired ? (
            <TouchableOpacity style={[styles.buyBtn, { backgroundColor: COLORS.error }]} onPress={handleEnroll}>
              <Text style={styles.buyBtnText}>Re-enroll</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.buyBtn} onPress={() => {
              const mod = course.modules[0]; const ch = mod?.chapters[0]; const step = ch?.steps[0];
              if (step) onStartLearning(courseId, ch.id, step.id);
            }}>
              <Play size={14} color="#fff" strokeWidth={2.5} fill="#fff" />
              <Text style={[styles.buyBtnText, { marginLeft: 6 }]}>Resume</Text>
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity style={styles.buyBtn} onPress={handleEnroll}>
            <Text style={styles.buyBtnText}>Buy Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f5f6fa', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: '#0d0d0d' },
  banner: { padding: SPACING.lg, paddingVertical: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bannerInner: { flex: 1 },
  bannerTag: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,204,2,0.15)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,204,2,0.3)',
  },
  bannerTitle: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  bannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  facultyCircles: { alignItems: 'center', gap: 4 },
  chipRow: {
    flexDirection: 'row', gap: 8, flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg, paddingVertical: 12,
    backgroundColor: '#fff',
  },
  infoChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f5f6fa', borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  packageCard: {
    margin: SPACING.lg, backgroundColor: '#fff',
    borderRadius: RADIUS.lg, padding: SPACING.md,
    borderWidth: 1.5, borderColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  expiryBanner: {
    marginHorizontal: SPACING.lg, marginTop: 6,
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: RADIUS.lg,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  expiryBannerOk:      { backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#a5d6a7' },
  expiryBannerWarn:    { backgroundColor: '#fff8e1', borderWidth: 1, borderColor: '#ffd54f' },
  expiryBannerExpired: { backgroundColor: COLORS.error },
  expiryTitle: { fontSize: 14, fontWeight: '800', color: '#0d0d0d' },
  expirySub:   { fontSize: 12, color: '#546e7a', marginTop: 2, fontWeight: '600' },
  reEnrollBtn: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  reEnrollBtnTxt: { color: COLORS.error, fontWeight: '900', fontSize: 13 },
  packageRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  radioSelected: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: COLORS.primary,
    borderWidth: 3, borderColor: '#e8eaf6',
  },
  bestValueTag: {
    backgroundColor: '#fff3e0', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: '#ffe0b2',
  },
  packageFeature: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 10,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: '#90a4ae' },
  tabTextActive: { color: COLORS.primary, fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0d0d0d', marginBottom: 10 },
  coordinatorCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f5f6fa', borderRadius: RADIUS.md,
    padding: 12, marginBottom: 16,
  },
  moduleHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f5f6fa', borderRadius: RADIUS.md, padding: 12,
  },
  chapterItem: {
    backgroundColor: '#fff', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: '#f0f0f0', marginTop: 6,
    overflow: 'hidden',
  },
  chapterHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  chapterNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#e8eaf6', borderWidth: 2, borderColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  stepRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: '#f5f6fa',
    marginLeft: 38,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f6fa',
  },
  buyBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#e0e0e0',
    ...SHADOWS.lg,
  },
  buyPrice: { fontSize: 22, fontWeight: '900', color: COLORS.primary },
  buyStrike: { fontSize: 14, color: '#90a4ae', textDecorationLine: 'line-through' },
  buyBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: 24, paddingVertical: 13,
  },
  buyBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
