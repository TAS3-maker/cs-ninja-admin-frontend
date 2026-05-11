import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../utils/theme';
import {
  MessageCircle, SlidersHorizontal, Paperclip, AlertCircle, Send,
  ChevronRight, ChevronLeft, ChevronUp, ChevronDown, BookOpen, Plus, X, Lock,
  RefreshCw as RefreshCcw,
} from 'lucide-react-native';
import { BottomNav } from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { useCourses } from '../context/CoursesContext';
import api from '../services/api';
import { rs, rf } from '../utils/responsive';

interface Props {
  onBack?: () => void;
  onTabChange?: (tab: string) => void;
  onOpenChat?: (mentorName: string, subject: string, context?: string, doubtId?: string) => void;
}

const INITIAL_DOUBTS: any[] = [];

// Map backend doubt → display shape used by the UI below.
const adapt = (d: any, courses: any[]): any => {
  const c = courses.find((x) => x.id === d.course_id);
  const chapter = (c?.modules || []).flatMap((m: any) => m.chapters || []).find((ch: any) => ch.id === d.chapter_id);
  return {
    id: d.id,
    courseId: d.course_id,
    courseTitle: c?.title || '—',
    chapterTitle: chapter?.title || d.topic || '—',
    topic: d.topic || 'General',
    question: d.question,
    askedAt: d.createdAt ? new Date(d.createdAt).toLocaleString() : '—',
    status: d.status === 'answered' ? 'Answered' : 'Pending',
    replies: (d.replies || []).map((r: any) => ({
      by: r.by,
      content: r.content,
      at: r.at ? new Date(r.at).toLocaleString() : '—',
    })),
  };
};

export const DoubtScreen: React.FC<Props> = ({ onTabChange, onOpenChat }) => {
  const { courses: COURSES } = useCourses();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('All');
  const [showAskModal, setShowAskModal] = useState(false);
  const [expandedDoubt, setExpandedDoubt] = useState<string | null>(null);
  const [doubts, setDoubts] = useState<any[]>([]);
  const [loadingDoubts, setLoadingDoubts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadDoubts = async () => {
    try {
      const r: any = await api.listDoubts();
      setDoubts((r.doubts || []).map((d: any) => adapt(d, COURSES)));
    } catch {}
  };

  useEffect(() => {
    if (!user || COURSES.length === 0) return;
    setLoadingDoubts(true);
    loadDoubts().finally(() => setLoadingDoubts(false));
  }, [user, COURSES.length]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDoubts();
    setRefreshing(false);
  };

  // Ask modal state
  const [pickedCourseId, setPickedCourseId] = useState<string | null>(null);
  const [pickedChapterId, setPickedChapterId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [showChapterPicker, setShowChapterPicker] = useState(false);

  const enrolledCourses = useMemo(
    () => COURSES.filter(c => user?.enrolledCourses.includes(c.id)),
    [user]
  );

  const pickedCourse = enrolledCourses.find(c => c.id === pickedCourseId);
  const allChapters = pickedCourse
    ? pickedCourse.modules.flatMap(m => m.chapters.map(ch => ({ ...ch, moduleTitle: m.title })))
    : [];
  const pickedChapter = allChapters.find(ch => ch.id === pickedChapterId);

  const filterOptions = ['All', ...enrolledCourses.map(c => c.title.split(' ').slice(0, 2).join(' '))];

  const filteredDoubts = activeFilter === 'All'
    ? doubts
    : doubts.filter(d => d.courseTitle.toLowerCase().includes(activeFilter.toLowerCase()));

  const openAskModal = () => {
    if (enrolledCourses.length === 0) {
      Alert.alert('No enrolled courses', 'Please enroll in a course first to ask doubts.');
      return;
    }
    setPickedCourseId(enrolledCourses[0].id);
    setPickedChapterId(null);
    setQuestion('');
    setShowAskModal(true);
  };

  const submitDoubt = async () => {
    if (!question.trim() || !pickedCourseId || !pickedChapterId) {
      Alert.alert('Incomplete', 'Please pick course, chapter and type your question.');
      return;
    }
    setSubmitting(true);
    try {
      const chapter = allChapters.find(ch => ch.id === pickedChapterId);
      const created: any = await api.askDoubt({
        course_id: pickedCourseId,
        chapter_id: pickedChapterId,
        topic: chapter?.title || '',
        question: question.trim(),
      });
      setDoubts((arr) => [adapt(created, COURSES), ...arr]);
      setShowAskModal(false);
      setQuestion('');
      Alert.alert('Doubt Submitted', 'A mentor will reply soon.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to submit doubt.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || enrolledCourses.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
        <View style={styles.header}><Text style={styles.headerTitle}>Doubts</Text></View>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconBox}>
            <Lock size={rs(40)} color={COLORS.primary} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>Enroll to Ask Doubts</Text>
          <Text style={styles.emptyDesc}>
            Purchase any course to unlock mentor doubt support for every chapter and module.
          </Text>
          <TouchableOpacity style={styles.exploreBtn} onPress={() => onTabChange && onTabChange('home')}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: rf(15) }}>Browse Courses</Text>
          </TouchableOpacity>
        </View>
        <BottomNav active="doubt" onChange={(t) => onTabChange && onTabChange(t)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Doubts</Text>
        <View style={{ flexDirection: 'row', gap: rs(8) }}>
          <TouchableOpacity
            style={styles.refreshHeaderBtn}
            onPress={onRefresh}
            disabled={refreshing}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            {refreshing
              ? <ActivityIndicator size="small" color={COLORS.primary} />
              : <RefreshCcw size={rs(16)} color={COLORS.primary} strokeWidth={2.2} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.askHeaderBtn} onPress={openAskModal}>
            <Plus size={rs(14)} color="#fff" strokeWidth={2.5} />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: rf(13), marginLeft: rs(4) }}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: rs(8), paddingHorizontal: SPACING.lg }}>
          {filterOptions.map(f => (
            <TouchableOpacity key={f} onPress={() => setActiveFilter(f)}
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, activeFilter === f && { color: '#fff' }]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Big Ask CTA */}
      <TouchableOpacity style={styles.askCard} onPress={openAskModal} activeOpacity={0.85}>
        <View style={styles.askIcon}>
          <MessageCircle size={rs(20)} color={COLORS.primary} strokeWidth={1.8} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.askTitle}>Ask a New Doubt</Text>
          <Text style={styles.askSub}>Pick any course · module · chapter</Text>
        </View>
        <ChevronRight size={rs(18)} color="#b0bec5" strokeWidth={2} />
      </TouchableOpacity>

      <Text style={styles.yourDoubtsTitle}>Your Doubts ({filteredDoubts.length})</Text>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: rs(20) }}>
        {filteredDoubts.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: rs(40) }}>
            <MessageCircle size={rs(40)} color="#e0e0e0" strokeWidth={1.5} />
            <Text style={{ color: '#90a4ae', marginTop: rs(10), fontSize: rf(14) }}>No doubts yet</Text>
          </View>
        ) : filteredDoubts.map(d => {
          const mentorName = d.replies[0]?.by || 'Mentor';
          const openChat = () => onOpenChat && onOpenChat(mentorName, d.topic || 'Subject Expert', `${d.courseTitle} · ${d.chapterTitle}`, d.id);
          return (
          <TouchableOpacity key={d.id} style={styles.doubtCard} onPress={openChat} activeOpacity={0.85}>
            <View style={styles.doubtCtxRow}>
              <BookOpen size={rs(12)} color={COLORS.primary} strokeWidth={2} />
              <Text style={styles.doubtCtxText} numberOfLines={1}>
                {d.courseTitle} · {d.chapterTitle}
              </Text>
            </View>

            <View style={styles.doubtHeader}>
              <View style={styles.doubtAvatar}><Text style={{ fontSize: rf(13), color: '#fff', fontWeight: '800' }}>Y</Text></View>
              <View style={{ flex: 1, marginLeft: rs(10) }}>
                <Text style={styles.doubtAuthor}>You</Text>
                <Text style={styles.doubtTime}>{d.askedAt}</Text>
              </View>
              <View style={[styles.statusBadge, d.status === 'Answered' ? styles.statusAnswered : styles.statusPending]}>
                <Text style={{ fontSize: rf(11), fontWeight: '800', color: d.status === 'Answered' ? COLORS.green : '#ff6f00' }}>
                  {d.status}
                </Text>
              </View>
            </View>

            <Text style={styles.doubtQuestion}>Q. {d.question}</Text>

            {d.replies.map((r, i) => (
              <View key={i} style={styles.replyCard}>
                <View style={styles.replyHeader}>
                  <View style={[styles.doubtAvatar, { backgroundColor: COLORS.primary }]}>
                    <Text style={{ fontSize: rf(11), color: '#fff', fontWeight: '800' }}>M</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: rs(8) }}>
                    <Text style={styles.replyAuthor}>{r.by}</Text>
                    <Text style={styles.doubtTime}>{r.at}</Text>
                  </View>
                  <View style={styles.mentorTag}>
                    <Text style={{ fontSize: rf(10), fontWeight: '800', color: COLORS.primary }}>MENTOR</Text>
                  </View>
                </View>
                <Text style={styles.replyContent} numberOfLines={2}>{r.content}</Text>
              </View>
            ))}

            {d.replies.length === 0 && (
              <View style={styles.awaitingReply}>
                <Text style={{ fontSize: rf(12), color: '#90a4ae', fontStyle: 'italic' }}>Awaiting mentor reply...</Text>
              </View>
            )}

            <View style={styles.openChatHint}>
              <MessageCircle size={rs(12)} color={COLORS.primary} strokeWidth={2} />
              <Text style={styles.openChatHintTxt}>Tap to open chat thread</Text>
              <ChevronRight size={rs(14)} color={COLORS.primary} strokeWidth={2} />
            </View>
          </TouchableOpacity>
        );})}
      </ScrollView>

      {/* Ask Modal */}
      <Modal visible={showAskModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAskModal(false)} style={styles.modalClose}>
              <X size={rs(20)} color="#0d0d0d" strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Ask a Doubt</Text>
            <View style={{ width: rs(36) }} />
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: rs(16) }} keyboardShouldPersistTaps="handled">
              {/* Course picker */}
              <Text style={styles.fieldLabel}>Course *</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowCoursePicker(true)}>
                <BookOpen size={rs(16)} color={pickedCourse ? COLORS.primary : '#90a4ae'} strokeWidth={1.8} />
                <Text style={[styles.pickerText, !pickedCourse && { color: '#90a4ae' }]} numberOfLines={1}>
                  {pickedCourse ? pickedCourse.title : 'Select course'}
                </Text>
                <ChevronDown size={rs(16)} color="#90a4ae" strokeWidth={2} />
              </TouchableOpacity>

              {/* Module/Chapter picker */}
              <Text style={[styles.fieldLabel, { marginTop: rs(14) }]}>Module & Chapter *</Text>
              <TouchableOpacity
                style={[styles.pickerBtn, !pickedCourse && { opacity: 0.5 }]}
                disabled={!pickedCourse}
                onPress={() => setShowChapterPicker(true)}>
                <Text style={[styles.pickerText, !pickedChapter && { color: '#90a4ae' }]} numberOfLines={1}>
                  {pickedChapter ? `${pickedChapter.moduleTitle} · ${pickedChapter.title}` : 'Select module & chapter'}
                </Text>
                <ChevronDown size={rs(16)} color="#90a4ae" strokeWidth={2} />
              </TouchableOpacity>

              {/* Question */}
              <Text style={[styles.fieldLabel, { marginTop: rs(14) }]}>Your Question *</Text>
              <TextInput
                value={question} onChangeText={setQuestion}
                placeholder="Type your question here..." placeholderTextColor="#b0bec5"
                multiline numberOfLines={5} style={styles.questionInput}
              />
              <Text style={{ textAlign: 'right', fontSize: rf(12), color: '#90a4ae', marginBottom: rs(12) }}>
                {500 - question.length} chars remaining
              </Text>

              <TouchableOpacity style={styles.attachBtn}>
                <Paperclip size={rs(15)} color="#546e7a" strokeWidth={1.8} />
                <Text style={{ fontSize: rf(13), color: '#546e7a', fontWeight: '600', marginLeft: rs(8) }}>Attach Screenshot</Text>
              </TouchableOpacity>

              <View style={styles.guidelinesBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(6) }}>
                  <AlertCircle size={rs(14)} color="#f57f17" strokeWidth={2} />
                  <Text style={{ fontSize: rf(13), fontWeight: '800', color: '#f57f17' }}>Community Guidelines</Text>
                </View>
                {['Be specific and clear', 'Check if already asked', 'Be respectful'].map((g, i) => (
                  <Text key={i} style={styles.guidelineItem}>• {g}</Text>
                ))}
              </View>
            </ScrollView>

            <View style={[styles.submitBar, { paddingBottom: Math.max(insets.bottom, rs(16)) }]}>
              <TouchableOpacity style={styles.submitBtn} onPress={submitDoubt}>
                <Send size={rs(16)} color="#fff" strokeWidth={2} />
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: rf(15), marginLeft: rs(8) }}>Submit Doubt</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>

          {/* Course picker sub-modal */}
          <Modal visible={showCoursePicker} transparent animationType="fade">
            <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowCoursePicker(false)}>
              <View style={styles.pickerSheet}>
                <Text style={styles.pickerTitle}>Select Course</Text>
                {enrolledCourses.map(c => (
                  <TouchableOpacity key={c.id} style={styles.pickerRow} onPress={() => { setPickedCourseId(c.id); setPickedChapterId(null); setShowCoursePicker(false); }}>
                    <View style={[styles.pickerRadio, pickedCourseId === c.id && styles.pickerRadioActive]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerRowTitle}>{c.title}</Text>
                      <Text style={styles.pickerRowSub}>{c.faculty.name}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Chapter picker sub-modal */}
          <Modal visible={showChapterPicker} transparent animationType="fade">
            <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowChapterPicker(false)}>
              <View style={styles.pickerSheet}>
                <Text style={styles.pickerTitle}>Select Module & Chapter</Text>
                <ScrollView style={{ maxHeight: rs(400) }}>
                  {pickedCourse?.modules.map(m => (
                    <View key={m.id} style={{ marginBottom: rs(8) }}>
                      <Text style={styles.moduleGroupTitle}>{m.title}</Text>
                      {m.chapters.map(ch => (
                        <TouchableOpacity key={ch.id} style={styles.pickerRow}
                          onPress={() => { setPickedChapterId(ch.id); setShowChapterPicker(false); }}>
                          <View style={[styles.pickerRadio, pickedChapterId === ch.id && styles.pickerRadioActive]} />
                          <Text style={styles.pickerRowTitle}>{ch.title}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>
        </SafeAreaView>
      </Modal>

      <BottomNav active="doubt" onChange={(t) => onTabChange && onTabChange(t)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: rs(14),
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  headerTitle: { fontSize: rf(18), fontWeight: '900', color: '#0d0d0d' },
  askHeaderBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingHorizontal: rs(14), paddingVertical: rs(8),
  },
  refreshHeaderBtn: {
    width: rs(38), height: rs(38), borderRadius: rs(19),
    backgroundColor: COLORS.primaryBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.primary + '33',
  },
  filterRow: { paddingVertical: rs(12), backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  filterChip: {
    backgroundColor: '#f5f6fa', borderRadius: RADIUS.full,
    paddingHorizontal: rs(16), paddingVertical: rs(8),
    borderWidth: 1.5, borderColor: '#e0e0e0',
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: rf(13), fontWeight: '700', color: '#546e7a' },
  askCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', margin: SPACING.lg,
    borderRadius: RADIUS.lg, padding: rs(14), gap: rs(12),
    borderWidth: 1.5, borderColor: COLORS.primary, ...SHADOWS.sm,
  },
  askIcon: {
    width: rs(44), height: rs(44), borderRadius: rs(12),
    backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  askTitle: { fontSize: rf(14), fontWeight: '800', color: '#0d0d0d' },
  askSub: { fontSize: rf(12), color: '#90a4ae', marginTop: rs(2) },
  yourDoubtsTitle: {
    fontSize: rf(15), fontWeight: '800', color: '#0d0d0d',
    paddingHorizontal: SPACING.lg, paddingTop: rs(4), paddingBottom: rs(8),
  },
  doubtCard: {
    backgroundColor: '#fff', marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg, padding: rs(14), marginBottom: rs(12),
    borderWidth: 1, borderColor: '#f0f0f0', ...SHADOWS.sm,
  },
  doubtCtxRow: {
    flexDirection: 'row', alignItems: 'center', gap: rs(6),
    backgroundColor: COLORS.primaryBg, borderRadius: RADIUS.sm,
    paddingHorizontal: rs(8), paddingVertical: rs(4), alignSelf: 'flex-start',
    marginBottom: rs(10),
  },
  doubtCtxText: { fontSize: rf(11), color: COLORS.primary, fontWeight: '700' },
  doubtHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: rs(10) },
  doubtAvatar: {
    width: rs(34), height: rs(34), borderRadius: rs(17),
    backgroundColor: '#546e7a', alignItems: 'center', justifyContent: 'center',
  },
  doubtAuthor: { fontSize: rf(13), fontWeight: '800', color: '#0d0d0d' },
  doubtTime: { fontSize: rf(11), color: '#90a4ae', marginTop: rs(1) },
  statusBadge: { borderRadius: RADIUS.full, paddingHorizontal: rs(10), paddingVertical: rs(4), borderWidth: 1 },
  statusAnswered: { backgroundColor: '#e8f5e9', borderColor: '#a5d6a7' },
  statusPending: { backgroundColor: '#fff3e0', borderColor: '#ffcc80' },
  doubtQuestion: { fontSize: rf(13), color: '#0d0d0d', lineHeight: rf(20), marginBottom: rs(10) },
  replyCard: {
    backgroundColor: '#f5f6fa', borderRadius: RADIUS.md,
    padding: rs(10), marginBottom: rs(6),
    borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  replyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: rs(6) },
  replyAuthor: { fontSize: rf(12), fontWeight: '800', color: '#0d0d0d' },
  mentorTag: {
    backgroundColor: '#e8eaf6', borderRadius: RADIUS.full,
    paddingHorizontal: rs(8), paddingVertical: rs(3),
    borderWidth: 1, borderColor: '#c5cae9',
  },
  replyContent: { fontSize: rf(13), color: '#546e7a', lineHeight: rf(20) },
  awaitingReply: { backgroundColor: '#f5f6fa', borderRadius: RADIUS.md, padding: rs(10) },
  openChatHint: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginTop: rs(10), paddingTop: rs(10), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#f0f0f0' },
  openChatHintTxt: { flex: 1, fontSize: rf(12), color: COLORS.primary, fontWeight: '700' },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: rs(40) },
  emptyIconBox: { width: rs(80), height: rs(80), borderRadius: rs(40), backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center', marginBottom: rs(20) },
  emptyTitle: { fontSize: rf(18), fontWeight: '900', color: '#0d0d0d', marginBottom: rs(8) },
  emptyDesc: { fontSize: rf(13), color: '#546e7a', textAlign: 'center', lineHeight: rf(20), marginBottom: rs(20) },
  exploreBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: rs(32), paddingVertical: rs(13) },

  // Modal
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: rs(14), paddingVertical: rs(12),
    borderBottomWidth: 1, borderBottomColor: '#e8e8e8',
  },
  modalClose: { width: rs(36), height: rs(36), borderRadius: rs(18), backgroundColor: '#f0f2f5', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { flex: 1, textAlign: 'center', fontSize: rf(17), fontWeight: '800', color: '#0d0d0d' },
  fieldLabel: { fontSize: rf(13), fontWeight: '700', color: '#546e7a', marginBottom: rs(8) },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: rs(10),
    backgroundColor: '#f5f6fa', borderRadius: RADIUS.md, padding: rs(14),
    borderWidth: 1.5, borderColor: '#e0e0e0',
  },
  pickerText: { flex: 1, fontSize: rf(14), color: '#0d0d0d', fontWeight: '600' },
  questionInput: {
    backgroundColor: '#f5f6fa', borderRadius: RADIUS.md,
    padding: rs(12), fontSize: rf(14), color: '#0d0d0d',
    textAlignVertical: 'top', minHeight: rs(110),
    borderWidth: 1.5, borderColor: '#e0e0e0', marginBottom: rs(4),
  },
  attachBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f5f6fa', borderRadius: RADIUS.md,
    padding: rs(12), marginBottom: rs(16),
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  guidelinesBox: {
    backgroundColor: '#fff8e1', borderRadius: RADIUS.md,
    padding: rs(14), marginBottom: rs(20),
    borderWidth: 1, borderColor: '#ffe082',
  },
  guidelineItem: { fontSize: rf(12), color: '#546e7a', marginBottom: rs(3) },
  submitBar: { padding: rs(16), borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: rs(13),
  },

  // Picker sub-modal
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: rs(20) },
  pickerSheet: { backgroundColor: '#fff', borderRadius: RADIUS.xl, padding: rs(16), maxHeight: '80%' },
  pickerTitle: { fontSize: rf(16), fontWeight: '900', color: '#0d0d0d', marginBottom: rs(14) },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: rs(10), paddingVertical: rs(12), paddingHorizontal: rs(4) },
  pickerRadio: { width: rs(18), height: rs(18), borderRadius: rs(9), borderWidth: 2, borderColor: '#b0bec5' },
  pickerRadioActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary, borderWidth: 5 },
  pickerRowTitle: { fontSize: rf(14), fontWeight: '700', color: '#0d0d0d', flex: 1 },
  pickerRowSub: { fontSize: rf(12), color: '#90a4ae', marginTop: rs(2) },
  moduleGroupTitle: {
    fontSize: rf(11), fontWeight: '900', color: COLORS.primary, letterSpacing: 1,
    paddingTop: rs(8), paddingBottom: rs(4), paddingHorizontal: rs(4),
  },
});
