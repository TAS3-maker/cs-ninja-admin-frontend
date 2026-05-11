import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { useCourses } from '../context/CoursesContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../utils/theme';
import { Bell, BookOpen, Lock, ChevronDown, ArrowRight, ChevronRight, TrendingUp, AlertTriangle } from 'lucide-react-native';
import { BottomNav } from '../components/BottomNav';
import { Avatar } from '../components/Avatar';

const { width } = Dimensions.get('window');

interface Props {
  onCoursePress: (courseId: string) => void;
  onTabChange?: (tab: string) => void;
}

export const StudyScreen: React.FC<Props> = ({ onCoursePress, onTabChange }) => {
  const { courses: COURSES } = useCourses();
  const { user } = useAuth();
  const { getCourseProgress, progress } = useProgress();
  const [selectedCourse, setSelectedCourse] = useState('CSEET');
  const enrolledCourses = COURSES.filter(c => user?.enrolledCourses.includes(c.id));
  const hasEnrolled = enrolledCourses.length > 0;

  // Dynamic catch-up stats
  const catchupStats = useMemo(() => {
    if (enrolledCourses.length === 0) return { overallPct: 0, daysLeft: 45, totalLectures: 0, done: 0, behindBy: 0, nextCourseId: null };
    let totalSteps = 0;
    let totalCompleted = 0;
    enrolledCourses.forEach(c => {
      c.modules.forEach(m => m.chapters.forEach(ch => {
        totalSteps += ch.steps.length;
        ch.steps.forEach(s => { if (progress.completedSteps.includes(s.id)) totalCompleted++; });
      }));
    });
    const pct = totalSteps ? Math.round((totalCompleted / totalSteps) * 100) : 0;
    const daysLeft = 45;
    // Ideal pace = started 45 days ago so (90-45)/90 = 50%. Behind if pct < ideal pace
    const idealPct = 50;
    const behindBy = Math.max(0, idealPct - pct);
    return { overallPct: pct, daysLeft, totalLectures: totalSteps, done: totalCompleted, behindBy, nextCourseId: enrolledCourses[0].id };
  }, [enrolledCourses, progress.completedSteps]);

  const schedule = [
    { subject: 'Corporate & restructuring', course: 'CSEET • Module 3', start: '4:00 PM', end: '5:00 PM' },
    { subject: 'Corporate & restructuring', course: 'CSEET • Module 3', start: '5:00 PM', end: '6:00 PM' },
    { subject: 'Business Communication', course: 'CSEET • Paper 1', start: '6:00 PM', end: '7:00 PM' },
  ];

  const handleCatchUp = () => {
    if (!catchupStats.nextCourseId) return;
    if (catchupStats.behindBy === 0) {
      Alert.alert('Great pace!', 'You are on track with your study plan. Keep going!');
    } else {
      Alert.alert('Catch Up Plan', `You are ${catchupStats.behindBy}% behind schedule. Open your next course and complete ${Math.ceil(catchupStats.totalLectures * catchupStats.behindBy / 100)} more lectures to get back on track.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start Now', onPress: () => onCoursePress(catchupStats.nextCourseId!) },
      ]);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.courseDropdown}>
          <Text style={styles.courseDropdownText}>{selectedCourse}</Text>
          <ChevronDown size={14} color={COLORS.textSecondary} strokeWidth={2} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.bellBtn}><Bell size={18} color='#546e7a' strokeWidth={1.8} /></TouchableOpacity>
      </View>

      {hasEnrolled ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Progress Banner */}
          <View style={styles.progressBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerLabel}>CSEET May 2026</Text>
              <Text style={styles.bannerDays}>{catchupStats.daysLeft} Days Left</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 3 }}>
                {catchupStats.done}/{catchupStats.totalLectures} lectures done
              </Text>
            </View>
            <View style={styles.bannerRight}>
              <Text style={styles.bannerPercent}>{catchupStats.overallPct}%</Text>
              <Text style={styles.bannerPercentLabel}>Syllabus Done</Text>
            </View>
            <TouchableOpacity style={[styles.catchUpBtn, catchupStats.behindBy === 0 && { backgroundColor: '#c8e6c9' }]} onPress={handleCatchUp}>
              <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
                {catchupStats.behindBy === 0
                  ? <TrendingUp size={12} color={COLORS.green} strokeWidth={2.5} />
                  : <AlertTriangle size={12} color="#ff6f00" strokeWidth={2.5} />}
                <Text style={{ color: catchupStats.behindBy === 0 ? COLORS.green : '#ff6f00', fontSize: 12, fontWeight: '800' }}>
                  {catchupStats.behindBy === 0 ? 'On Track' : `${catchupStats.behindBy}% Behind`}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Today's Schedule */}
          <View style={{ paddingHorizontal: SPACING.lg, marginTop: SPACING.md }}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            {schedule.map((item, i) => (
              <View key={i} style={styles.scheduleCard}>
                <View style={styles.scheduleTimeline}>
                  <View style={styles.timelineDot} />
                  {i < schedule.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.scheduleContent}>
                  <View style={styles.scheduleMain}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scheduleSubject}>{item.subject}</Text>
                      <Text style={styles.scheduleCourse}>{item.course}</Text>
                    </View>
                    <View style={styles.scheduleActions}>
                      <TouchableOpacity style={styles.scheduleActionBtn}>
                        <Bell size={14} color='#546e7a' strokeWidth={1.8} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.scheduleActionBtn}>
                        <BookOpen size={14} color='#546e7a' strokeWidth={1.8} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.scheduleTime}>{item.start} - {item.end}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* My Courses */}
          <View style={{ paddingHorizontal: SPACING.lg, marginTop: SPACING.lg, marginBottom: 32 }}>
            <Text style={styles.sectionTitle}>My Courses</Text>
            {enrolledCourses.map(c => (
              <TouchableOpacity key={c.id} onPress={() => onCoursePress(c.id)} style={styles.myCourseCard}>
                <Avatar name={c.faculty.name} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.myCourseTitle} numberOfLines={1}>{c.title}</Text>
                  <Text style={styles.myCourseFaculty}>{c.faculty.name}</Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: '20%' }]} />
                  </View>
                </View>
                <ChevronRight size={16} color={COLORS.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        /* Not enrolled — locked state */
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={styles.progressBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerLabel}>CSEET May 2026</Text>
              <Text style={styles.bannerDays}>45 Days Left</Text>
            </View>
            <View style={styles.bannerRight}>
              <Text style={styles.bannerPercent}>62%</Text>
              <Text style={styles.bannerPercentLabel}>Syllabus Done</Text>
            </View>
          </View>

          <View style={styles.lockedCard}>
            <View style={styles.lockIconBox}>
              <Lock size={36} color="#fff" strokeWidth={1.8} />
            </View>
            <Text style={styles.lockedTitle}>Purchase a Course to Continue</Text>
            <Text style={styles.lockedDesc}>
              Buy any course to unlock your personalized dashboard with live classes, progress tracking, and expert doubt support.
            </Text>
            <View style={styles.featureChips}>
              {['Live Classes', 'Progress Tracking', 'Doubt Support'].map((f, i) => (
                <View key={i} style={styles.featureChip}>
                  <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' }}>{f}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.exploreBtn} onPress={() => COURSES[0] && onCoursePress(COURSES[0].id)}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Explore Courses</Text>
            </TouchableOpacity>
          </View>

          {/* Locked schedule preview */}
          {schedule.map((item, i) => (
            <View key={i} style={[styles.scheduleCard, { marginHorizontal: SPACING.lg, opacity: 0.4 }]}>
              <View style={styles.scheduleTimeline}>
                <View style={styles.timelineDot} />
                {i < schedule.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.scheduleContent}>
                <Text style={styles.scheduleSubject}>{item.subject}</Text>
                <Text style={styles.scheduleTime}>{item.start} - {item.end}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
      <BottomNav active="study" onChange={(t) => onTabChange && onTabChange(t)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  courseDropdown: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f5f6fa', borderRadius: RADIUS.full,
    paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  courseDropdownText: { fontSize: 14, fontWeight: '800', color: '#0d0d0d' },
  bellBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#f5f6fa', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  progressBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primary, margin: SPACING.lg,
    borderRadius: RADIUS.lg, padding: SPACING.md,
  },
  bannerLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  bannerDays: { fontSize: 18, fontWeight: '900', color: '#fff', marginTop: 2 },
  bannerRight: { alignItems: 'center', marginRight: 12 },
  bannerPercent: { fontSize: 22, fontWeight: '900', color: '#fff' },
  bannerPercentLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  catchUpBtn: {
    backgroundColor: '#fff', borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0d0d0d', marginBottom: 12 },
  scheduleCard: {
    flexDirection: 'row', marginBottom: 0,
  },
  scheduleTimeline: { width: 24, alignItems: 'center', marginRight: 10 },
  timelineDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: COLORS.primary, marginTop: 6,
  },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#e0e0e0', marginTop: 4 },
  scheduleContent: {
    flex: 1, backgroundColor: '#fff', borderRadius: RADIUS.md,
    padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#f0f0f0',
    ...SHADOWS.sm,
  },
  scheduleMain: { flexDirection: 'row', alignItems: 'flex-start' },
  scheduleSubject: { fontSize: 13, fontWeight: '800', color: '#0d0d0d' },
  scheduleCourse: { fontSize: 11, color: '#90a4ae', marginTop: 2 },
  scheduleActions: { flexDirection: 'row', gap: 8 },
  scheduleActionBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#f5f6fa', alignItems: 'center', justifyContent: 'center',
  },
  scheduleTime: { fontSize: 12, color: COLORS.primary, fontWeight: '700', marginTop: 6 },
  myCourseCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: RADIUS.md,
    padding: 12, gap: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#f0f0f0', ...SHADOWS.sm,
  },
  myCourseIcon: {
    width: 48, height: 48, borderRadius: 10,
    backgroundColor: '#e8eaf6', alignItems: 'center', justifyContent: 'center',
  },
  myCourseTitle: { fontSize: 13, fontWeight: '800', color: '#0d0d0d' },
  myCourseFaculty: { fontSize: 11, color: '#90a4ae', marginTop: 1 },
  progressBar: {
    height: 3, backgroundColor: '#e0e0e0',
    borderRadius: 2, overflow: 'hidden', marginTop: 6,
  },
  progressFill: { height: '100%', backgroundColor: COLORS.green, borderRadius: 2 },
  lockedCard: {
    backgroundColor: '#fff', margin: SPACING.lg,
    borderRadius: RADIUS.xl, padding: SPACING.xl,
    alignItems: 'center', ...SHADOWS.md,
  },
  lockIconBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  lockedTitle: { fontSize: 18, fontWeight: '900', color: '#0d0d0d', textAlign: 'center', marginBottom: 10 },
  lockedDesc: { fontSize: 13, color: '#546e7a', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  featureChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 },
  featureChip: {
    backgroundColor: '#f5f6fa', borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  exploreBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: 32, paddingVertical: 14, width: '100%', alignItems: 'center',
  },
});
