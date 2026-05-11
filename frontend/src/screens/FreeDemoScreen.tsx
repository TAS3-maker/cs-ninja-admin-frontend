import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Dimensions, Alert, Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Play, ArrowRight, Eye, X, Lock } from 'lucide-react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../utils/theme';
import { Avatar } from '../components/Avatar';
import { VideoPlayer } from '../components/VideoPlayer';
import { rs, rf } from '../utils/responsive';

const DEMO_VIDEO_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';
const PREVIEW_LIMIT_SECONDS = 60;

const { width } = Dimensions.get('window');

interface Props {
  onBack: () => void;
  onCoursePress: (courseId: string) => void;
}

const DEMO_VIDEOS = [
  {
    id: 'dv1', courseId: 'course_001',
    title: 'Business Communication — Introduction',
    faculty: 'Adv. Pawandeep Kaur', subject: 'CSEET · Paper 1',
    duration: '18:32', views: '12.4K', isNew: true,
    thumbnail: '📹',
  },
  {
    id: 'dv2', courseId: 'course_001',
    title: 'Economic & Business Environment Overview',
    faculty: 'Adv. Kusum Kapuria', subject: 'CSEET · Paper 2',
    duration: '22:15', views: '9.8K', isNew: false,
    thumbnail: '📹',
  },
  {
    id: 'dv3', courseId: 'course_002',
    title: 'Company Law — Corporate Fundamentals',
    faculty: 'CA Rohit Mehta', subject: 'CS Executive · Module 1',
    duration: '31:04', views: '7.2K', isNew: true,
    thumbnail: '📹',
  },
  {
    id: 'dv4', courseId: 'course_001',
    title: 'Current Affairs & Business GK — CSEET',
    faculty: 'Ms. Shrishti Bhatia', subject: 'CSEET · Paper 4',
    duration: '25:44', views: '5.6K', isNew: false,
    thumbnail: '📹',
  },
  {
    id: 'dv5', courseId: 'course_003',
    title: 'Corporate Governance — Introduction',
    faculty: 'Adv. Sandeep Gupta', subject: 'CS Professional',
    duration: '28:10', views: '3.1K', isNew: false,
    thumbnail: '📹',
  },
];

const CATEGORIES = ['All', 'CSEET', 'Executive', 'Professional'];

export const FreeDemoScreen: React.FC<Props> = ({ onBack, onCoursePress }) => {
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = activeCategory === 'All'
    ? DEMO_VIDEOS
    : DEMO_VIDEOS.filter(v => v.subject.toLowerCase().includes(activeCategory.toLowerCase()));

  const insets = useSafeAreaInsets();
  const [activeVideo, setActiveVideo] = useState<typeof DEMO_VIDEOS[0] | null>(null);
  const [previewEnded, setPreviewEnded] = useState(false);

  const handlePlay = (video: typeof DEMO_VIDEOS[0]) => {
    setPreviewEnded(false);
    setActiveVideo(video);
  };
  const closePlayer = () => { setActiveVideo(null); setPreviewEnded(false); };
  const enrollFromPlayer = () => {
    const courseId = activeVideo?.courseId;
    closePlayer();
    if (courseId) onCoursePress(courseId);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ChevronLeft size={20} color="#0d0d0d" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Free Demo Lectures</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient colors={['#0d1b4b', '#1a237e', '#1565c0']} style={styles.hero}>
          <View style={styles.heroBadge}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>FREE ACCESS</Text>
          </View>
          <Text style={styles.heroTitle}>Watch Free Demo Lectures</Text>
          <Text style={styles.heroDesc}>
            Get a feel of CS Ninja's teaching style before enrolling. No signup required for demos.
          </Text>
          <View style={styles.heroStats}>
            {[
              { val: '50+', label: 'Demo Videos' },
              { val: '12+', label: 'Faculty' },
              { val: '3', label: 'CS Levels' },
            ].map((s, i) => (
              <View key={i} style={styles.heroStat}>
                <Text style={styles.heroStatVal}>{s.val}</Text>
                <Text style={styles.heroStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: SPACING.lg, paddingVertical: 12 }}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat} onPress={() => setActiveCategory(cat)}
              style={[styles.catChip, activeCategory === cat && styles.catChipActive]}>
              <Text style={[styles.catChipText, activeCategory === cat && { color: '#fff' }]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured video (large) */}
        {filtered.length > 0 && (
          <TouchableOpacity onPress={() => handlePlay(filtered[0])} style={styles.featuredCard} activeOpacity={0.9}>
            <LinearGradient colors={['#1a237e', '#283593']} style={styles.featuredThumb}>
              <View style={styles.featuredPlayBtn}>
                <Play size={32} color="#fff" strokeWidth={1.5} fill="#fff" />
              </View>
              <View style={styles.featuredDuration}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{filtered[0].duration}</Text>
              </View>
              {filtered[0].isNew && (
                <View style={styles.newTag}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>NEW</Text>
                </View>
              )}
              <View style={styles.featuredFacultyRow}>
                <Avatar name={filtered[0].faculty} size={32} bgColor="rgba(255,255,255,0.2)" borderColor="rgba(255,255,255,0.4)" />
                <View>
                  <Text style={styles.featuredFacultyName}>{filtered[0].faculty}</Text>
                  <Text style={styles.featuredFacultySubject}>{filtered[0].subject}</Text>
                </View>
              </View>
            </LinearGradient>
            <View style={styles.featuredBody}>
              <Text style={styles.featuredTitle}>{filtered[0].title}</Text>
              <View style={styles.featuredMeta}>
                <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
                  <Eye size={12} color="#90a4ae" strokeWidth={1.8} />
                  <Text style={styles.featuredMetaText}>{filtered[0].views} views</Text>
                </View>
                <Text style={styles.featuredMetaText}>·</Text>
                <Text style={styles.featuredMetaText}>{filtered[0].duration}</Text>
              </View>
              <TouchableOpacity style={styles.watchNowBtn} onPress={() => handlePlay(filtered[0])}>
                <Text style={styles.watchNowText}>Watch Free Demo</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}

        {/* More demos list */}
        <View style={{ paddingHorizontal: SPACING.lg, marginTop: SPACING.md }}>
          <Text style={styles.sectionTitle}>More Demo Lectures</Text>
          {filtered.slice(1).map(video => (
            <TouchableOpacity key={video.id} onPress={() => handlePlay(video)} style={styles.videoRow} activeOpacity={0.85}>
              {/* Thumbnail */}
              <LinearGradient colors={['#1a237e', '#3949ab']} style={styles.rowThumb}>
                <Play size={22} color="rgba(255,255,255,0.5)" strokeWidth={1.5} fill="rgba(255,255,255,0.4)" />
                <View style={styles.rowDuration}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{video.duration}</Text>
                </View>
              </LinearGradient>

              {/* Info */}
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={2}>{video.title}</Text>
                <Text style={styles.rowFaculty}>{video.faculty}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <Text style={styles.rowMeta}>{video.subject}</Text>
                  {video.isNew && (
                    <View style={styles.rowNewTag}>
                      <Text style={{ fontSize: 9, fontWeight: '800', color: COLORS.green }}>NEW</Text>
                    </View>
                  )}
                </View>
                <View style={{flexDirection:'row',alignItems:'center',gap:3,marginTop:3}}>
                  <Eye size={10} color="#90a4ae" strokeWidth={1.8} />
                  <Text style={styles.rowViews}>{video.views} views</Text>
                </View>
              </View>

              {/* Play button */}
              <View style={styles.playCircle}>
                <Play size={14} color={COLORS.primary} strokeWidth={2} fill={COLORS.primary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* CTA bottom */}
        <View style={styles.ctaBox}>
          <Text style={styles.ctaTitle}>Ready to go deeper?</Text>
          <Text style={styles.ctaDesc}>Enroll in a full course to unlock all lectures, notes, and tests.</Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => onCoursePress('course_001')}>
            <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
              <Text style={styles.ctaBtnText}>View All Courses</Text>
              <ArrowRight size={14} color="#fff" strokeWidth={2.5} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Demo Video Popup */}
      <Modal visible={!!activeVideo} animationType="slide" transparent onRequestClose={closePlayer}>
        <View style={styles.playerOverlay}>
          <View style={styles.playerCard}>
            <View style={styles.playerHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeTxt}>FREE PREVIEW · 1 MIN</Text>
                </View>
                <Text style={styles.playerTitle} numberOfLines={2}>{activeVideo?.title}</Text>
                <Text style={styles.playerFaculty}>{activeVideo?.faculty} · {activeVideo?.subject}</Text>
              </View>
              <TouchableOpacity onPress={closePlayer} style={styles.closeBtn}>
                <X size={rs(20)} color="#0d0d0d" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {activeVideo && (
              <View style={{ position: 'relative' }}>
                <VideoPlayer
                  source={DEMO_VIDEO_URL}
                  previewSeconds={PREVIEW_LIMIT_SECONDS}
                  onPreviewEnd={() => setPreviewEnded(true)}
                  showCaptions={false}
                  autoPlay
                />
                {previewEnded && (
                  <View style={styles.enrollOverlay}>
                    <View style={styles.enrollIconBox}>
                      <Lock size={rs(36)} color="#fff" strokeWidth={1.8} />
                    </View>
                    <Text style={styles.enrollTitle}>Preview Ended</Text>
                    <Text style={styles.enrollSub}>Enroll in the course to watch the full lecture and unlock all content.</Text>
                    <TouchableOpacity style={styles.enrollBtn} onPress={enrollFromPlayer}>
                      <Text style={styles.enrollBtnTxt}>Enroll Now</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={closePlayer}>
                      <Text style={styles.enrollCancel}>Maybe later</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {!previewEnded && (
              <View style={[styles.playerFooter, { paddingBottom: Math.max(insets.bottom, rs(12)) }]}>
                <TouchableOpacity style={styles.footerEnrollBtn} onPress={enrollFromPlayer}>
                  <Text style={styles.footerEnrollTxt}>Enroll Now · Unlock Full Course</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f5f6fa', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '900', color: '#0d0d0d' },
  hero: { padding: SPACING.lg, paddingVertical: 28 },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start',
    marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 8 },
  heroDesc: { fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 20, marginBottom: 20 },
  heroStats: { flexDirection: 'row', gap: 24 },
  heroStat: { alignItems: 'center' },
  heroStatVal: { fontSize: 20, fontWeight: '900', color: '#fff' },
  heroStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  catChip: {
    backgroundColor: '#fff', borderRadius: RADIUS.full,
    paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1.5, borderColor: '#e0e0e0',
  },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipText: { fontSize: 13, fontWeight: '700', color: '#546e7a' },
  featuredCard: {
    backgroundColor: '#fff', marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.xl, overflow: 'hidden',
    ...SHADOWS.md, borderWidth: 1, borderColor: '#f0f0f0',
    marginBottom: SPACING.sm,
  },
  featuredThumb: { height: 200, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  featuredPlayBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  featuredDuration: {
    position: 'absolute', bottom: 56, right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  newTag: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: COLORS.green, borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  featuredFacultyRow: {
    position: 'absolute', bottom: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  featuredFacultyAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
  },
  featuredFacultyName: { fontSize: 12, fontWeight: '800', color: '#fff' },
  featuredFacultySubject: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  featuredBody: { padding: SPACING.md },
  featuredTitle: { fontSize: 15, fontWeight: '800', color: '#0d0d0d', marginBottom: 6, lineHeight: 22 },
  featuredMeta: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 12 },
  featuredMetaText: { fontSize: 12, color: '#90a4ae' },
  watchNowBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: 12, alignItems: 'center',
  },
  watchNowText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#0d0d0d', marginBottom: 12 },
  videoRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    padding: 12, gap: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#f0f0f0', ...SHADOWS.sm,
  },
  rowThumb: {
    width: 90, height: 60, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  rowDuration: {
    position: 'absolute', bottom: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 3,
    paddingHorizontal: 4, paddingVertical: 2,
  },
  rowTitle: { fontSize: 13, fontWeight: '800', color: '#0d0d0d', lineHeight: 18 },
  rowFaculty: { fontSize: 11, color: '#90a4ae', marginTop: 2 },
  rowMeta: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  rowNewTag: {
    backgroundColor: '#e8f5e9', borderRadius: 3,
    paddingHorizontal: 5, paddingVertical: 2,
    borderWidth: 1, borderColor: '#a5d6a7',
  },
  rowViews: { fontSize: 11, color: '#90a4ae', marginTop: 3 },
  playCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#e8eaf6', alignItems: 'center', justifyContent: 'center',
  },
  ctaBox: {
    backgroundColor: '#fff', margin: SPACING.lg,
    borderRadius: RADIUS.xl, padding: SPACING.lg,
    alignItems: 'center', ...SHADOWS.sm,
    borderWidth: 1, borderColor: '#f0f0f0',
  },
  ctaTitle: { fontSize: 18, fontWeight: '900', color: '#0d0d0d', marginBottom: 6 },
  ctaDesc: { fontSize: 13, color: '#546e7a', textAlign: 'center', marginBottom: 16 },
  ctaBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: 28, paddingVertical: 13,
  },
  ctaBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Demo player modal
  playerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'flex-end' },
  playerCard: { backgroundColor: '#fff', borderTopLeftRadius: rs(20), borderTopRightRadius: rs(20), overflow: 'hidden' },
  playerHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: rs(12), padding: rs(14), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e0e0e0' },
  freeBadge: { backgroundColor: '#ffb300', alignSelf: 'flex-start', borderRadius: rs(4), paddingHorizontal: rs(8), paddingVertical: rs(3), marginBottom: rs(6) },
  freeBadgeTxt: { color: '#0d0d0d', fontSize: rf(10), fontWeight: '900', letterSpacing: 0.5 },
  playerTitle: { fontSize: rf(15), fontWeight: '900', color: '#0d0d0d', lineHeight: rf(20) },
  playerFaculty: { fontSize: rf(12), color: '#90a4ae', marginTop: rs(2) },
  closeBtn: { width: rs(32), height: rs(32), borderRadius: rs(16), backgroundColor: '#f0f2f5', alignItems: 'center', justifyContent: 'center' },
  playerFooter: { paddingHorizontal: rs(14), paddingTop: rs(10) },
  footerEnrollBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: rs(13), alignItems: 'center' },
  footerEnrollTxt: { color: '#fff', fontSize: rf(14), fontWeight: '800' },

  // Enroll overlay (preview ended)
  enrollOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13,17,23,0.95)', alignItems: 'center', justifyContent: 'center', padding: rs(24) },
  enrollIconBox: { width: rs(70), height: rs(70), borderRadius: rs(35), backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: rs(16), borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)' },
  enrollTitle: { fontSize: rf(22), fontWeight: '900', color: '#fff', marginBottom: rs(8), textAlign: 'center' },
  enrollSub: { fontSize: rf(13), color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: rf(20), marginBottom: rs(20) },
  enrollBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: rs(14), paddingHorizontal: rs(48), marginBottom: rs(12) },
  enrollBtnTxt: { color: '#fff', fontSize: rf(15), fontWeight: '900' },
  enrollCancel: { color: 'rgba(255,255,255,0.6)', fontSize: rf(13), fontWeight: '600' },
});
