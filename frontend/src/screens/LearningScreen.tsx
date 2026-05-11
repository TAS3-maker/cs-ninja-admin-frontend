import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, Platform, KeyboardAvoidingView,
  PanResponder, Animated, Alert, Dimensions, Pressable, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft, Settings, Maximize2, RotateCcw, RotateCw,
  Pause, Play, Edit2, AlignJustify,
  Plus, MessageCircle, FileText,
  X, ChevronRight, Trash2, Lightbulb, CheckCircle,
  Send, Paperclip, AlertCircle, Captions, Download,
  Bookmark, Sparkles, Gauge, Languages, Type, AlignLeft,
  RotateCcw as Reset, Check, ScrollText, RefreshCw,
} from 'lucide-react-native';
import { useProgress } from '../context/ProgressContext';
import { useAuth } from '../context/AuthContext';
import { useCourses } from '../context/CoursesContext';
import { COLORS, RADIUS, SHADOWS } from '../utils/theme';
import { rs, rf, isTablet, contentMaxWidth } from '../utils/responsive';
import { VideoPlayer } from '../components/VideoPlayer';
import { WebView } from 'react-native-webview';
import api from '../services/api';

const FALLBACK_VIDEO_URL = 'https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4';

interface Props { courseId: string; chapterId: string; stepId: string; onBack: () => void; onOpenDoubtChat?: (mentorName: string, subject: string, ctx: string, doubtId: string) => void; }
type BottomTab = 'Transcript' | 'Notes' | 'PDF' | 'Doubt';

// Helper to convert mm:ss → seconds
const toSec = (t: string) => {
  const [m, s] = t.split(':').map(Number);
  return (m || 0) * 60 + (s || 0);
};

const fmtMMSS = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

// ── Transcript types ──────────────────────────────────────────────────────
// Transcript is fetched live from /api/courses/{cid}/steps/{sid}/transcript
// Backend returns: [{ sec: number, topic: string, text: string }]
// FLAT_TRANSCRIPT is computed below from state, not module-level.

// Mock PDF pages
const PDF_PAGES = [
  { page: 1, title: 'Business Communication — Chapter 2', preview: 'This chapter covers the fundamentals of written and verbal business communication with detailed examples and case studies.' },
  { page: 2, title: 'Types of Communication', preview: 'Formal vs Informal communication. The 7 Cs of Communication. Internal vs External channels.' },
  { page: 3, title: 'Barriers to Communication', preview: 'Physical, psychological, semantic and organizational barriers. How to overcome them in a business setting.' },
];

const SUBJECTS = ['Business Communication', 'Accounts', 'GST Law', 'Law', 'Economics'];

export const LearningScreen: React.FC<Props> = ({ courseId, chapterId, stepId, onBack, onOpenDoubtChat }) => {
  const { courses: COURSES } = useCourses();
  const insets = useSafeAreaInsets();
  const { completeStep, isStepCompleted, addNote, deleteNote, progress } = useProgress();
  const { updateXP, user } = useAuth();

  const [currentStepId, setCurrentStepId] = useState(stepId);
  const [currentChapterId, setCurrentChapterId] = useState(chapterId);
  const [bottomTab, setBottomTab] = useState<BottomTab>('Transcript');
  const [noteText, setNoteText] = useState('');
  // Auto-scroll plumbing for the Transcript tab
  const scrollViewRef = useRef<any>(null);
  const transcriptScrollRef = useRef<View | null>(null);
  const transcriptContainerY = useRef<number>(0);
  const lineYsRef = useRef<Record<string, number>>({});
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const cycleSpeed = () => {
    const idx = SPEED_OPTIONS.indexOf(playbackRate);
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    setPlaybackRate(next);
  };

  // Auto-scroll the transcript ScrollView to the active entry whenever it
  // changes, but only on the Transcript tab and only when autoScroll is on.

  const [selectedTimestamp, setSelectedTimestamp] = useState<string | null>(null);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showDoubtModal, setShowDoubtModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfPreviewItem, setPdfPreviewItem] = useState<{ url: string; title: string } | null>(null);
  const [doubtText, setDoubtText] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('Business Communication');
  const [currentPdfPage, setCurrentPdfPage] = useState(0);
  const [showCaptions, setShowCaptions] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [seekRequest, setSeekRequest] = useState<number | undefined>(undefined);
  const [showSettings, setShowSettings] = useState(false);
  const [themeMode, setThemeMode] = useState<'light' | 'brown' | 'dark'>('light');
  const [fontSize, setFontSize] = useState(14);
  const [lineSpacing, setLineSpacing] = useState(1.5);
  const [autoScroll, setAutoScroll] = useState(true);
  const [language, setLanguage] = useState('English');
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [showTabs, setShowTabs] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string>(FALLBACK_VIDEO_URL);
  const [videoLoading, setVideoLoading] = useState(true);
  // Live doubts loaded for this course (Doubt tab inside the player)
  const [courseDoubts, setCourseDoubts] = useState<any[]>([]);
  const [doubtsRefreshing, setDoubtsRefreshing] = useState(false);
  const loadCourseDoubts = useCallback(async () => {
    if (!courseId) return;
    setDoubtsRefreshing(true);
    try {
      const r: any = await api.listDoubts();
      const list = (r.doubts || []).filter((d: any) => d.course_id === courseId);
      // newest first
      list.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setCourseDoubts(list);
    } catch (e) {
      // silent
    } finally { setDoubtsRefreshing(false); }
  }, [courseId]);
  useEffect(() => { loadCourseDoubts(); }, [loadCourseDoubts]);

  const totalTime = 1095;



  // Theme palettes
  const theme = {
    light: { bg: '#fff', text: '#0d0d0d', muted: '#546e7a', border: '#f0f0f0', timeText: '#90a4ae', highlightBg: '#f5f6fa', highlightTime: COLORS.primary },
    brown: { bg: '#f5ecd7', text: '#3e2723', muted: '#6d4c41', border: '#e0cfa8', timeText: '#8d6e63', highlightBg: '#eadab1', highlightTime: '#6d4c41' },
    dark:  { bg: '#1a1a1f', text: '#fff', muted: '#b0bec5', border: '#2a2a32', timeText: '#90a4ae', highlightBg: '#2a2a36', highlightTime: '#4fc3f7' },
  }[themeMode];

  // Live caption derived from currentTime
  // Transcript entries are loaded from /api/courses/{cid}/steps/{sid}/transcript.
  const [transcriptEntries, setTranscriptEntries] = useState<{ sec: number; topic: string; text: string }[]>([]);
  const FLAT_TRANSCRIPT = transcriptEntries
    .slice()
    .sort((a, b) => a.sec - b.sec)
    .map((e, i) => ({ ...e, time: fmtMMSS(e.sec), segIdx: 0, entIdx: i }));
  // Group consecutive entries by topic for the segment view
  const TRANSCRIPT_SEGMENTS = (() => {
    const out: { topic: string; entries: { time: string; text: string; sec: number }[] }[] = [];
    for (const e of FLAT_TRANSCRIPT) {
      const last = out[out.length - 1];
      if (last && last.topic === e.topic) last.entries.push({ time: e.time, text: e.text, sec: e.sec });
      else out.push({ topic: e.topic, entries: [{ time: e.time, text: e.text, sec: e.sec }] });
    }
    return out;
  })();
  const activeEntry = FLAT_TRANSCRIPT.slice().reverse().find(e => e.sec <= currentTime) || FLAT_TRANSCRIPT[0];

  const course = COURSES.find(c => c.id === courseId);
  const allChapters = (course?.modules || []).flatMap((m: any) => m.chapters || []);
  const chapter = allChapters.find(c => c.id === currentChapterId);
  const step = chapter?.steps.find(s => s.id === currentStepId);
  const stepNotes = progress.notes.filter(n => n.stepId === currentStepId);
  const isCompleted = isStepCompleted(currentStepId);

  // ── DYNAMIC MODULE ITEMS (from admin schema) ─────────────────────────────
  // Find the admin module that contains the currentStepId by walking
  // course.chapters[] -> modules[] -> items[]. The legacy step.id IS the
  // admin item.id (set by admin_routes._new_id("itm")).
const currentAdminModule = React.useMemo(() => {
    // New shape: chapters[].modules[].items[]
    for (const ch of (course?.chapters || [])) {
      for (const mod of (ch.modules || [])) {
        if ((mod.items || []).some((it: any) => it.id === currentStepId)) {
          return mod;
        }
      }
    }
    // Legacy shape: modules[].chapters[].steps[] — wrap steps as items
    for (const paper of (course?.modules || [])) {
      for (const ch of (paper.chapters || [])) {
        if ((ch.steps || []).some((s: any) => s.id === currentStepId)) {
          return { ...ch, items: ch.steps };
        }
      }
    }
    return null;
  }, [course, currentStepId]);
  const progressPct = React.useMemo(() => {
    if (!course) return 0;
    const ids: string[] = [];
    for (const m of (course.modules || [])) {
      for (const ch of (m.chapters || [])) {
        for (const s of (ch.steps || [])) if (s?.id) ids.push(s.id);
      }
    }
    if (ids.length === 0) return 0;
    const set = new Set(progress.completedSteps);
    let done = 0; for (const id of ids) if (set.has(id)) done++;
    return Math.round((done / ids.length) * 100);
  }, [course, progress.completedSteps]);

  const moduleItems: any[] = (currentAdminModule?.items || []).slice();

  // Derive tab order from items[] sequence. Each item type contributes a tab
  // at its first occurrence position. 'Notes' is always available (user-only)
  // and pinned right after the first video tab (or at the end if no video).
  const dynamicTabs: { id: BottomTab; Icon: any; label: string }[] = React.useMemo(() => {
    const TYPE_TO_TAB: Record<string, { id: BottomTab; Icon: any; label: string }> = {
      video:   { id: 'Transcript', Icon: AlignJustify,   label: 'Transcript' },
      pdf:     { id: 'PDF',        Icon: FileText,       label: 'PDF'        },
      doubt:   { id: 'Doubt',      Icon: MessageCircle,  label: 'Doubt'      },
    };
    const seen = new Set<BottomTab>();
    const ordered: { id: BottomTab; Icon: any; label: string }[] = [];
    let videoSeen = false;
    let notesInserted = false;
    for (const it of moduleItems) {
      const tab = TYPE_TO_TAB[it.type];
      if (!tab) continue;
      if (seen.has(tab.id)) continue;
      seen.add(tab.id);
      ordered.push(tab);
      if (tab.id === 'Transcript') {
        // Pin Notes right after first Transcript so users can quickly switch.
        ordered.push({ id: 'Notes', Icon: Edit2, label: 'Notes' });
        notesInserted = true;
        videoSeen = true;
      }
    }
    if (!notesInserted) {
      ordered.push({ id: 'Notes', Icon: Edit2, label: 'Notes' });
    }
    // Fallback: if nothing was found (legacy course without chapters[] data),
    // show all four tabs in a sensible default order.
// Fallback: if nothing was found (legacy course without chapters[] data),
    // check if current step has a video_url to decide whether to show Transcript.
    if (ordered.length === 0 || (ordered.length === 1 && ordered[0].id === 'Notes')) {
      const hasVideo = !!(step as any)?.video_url;
      return [
        ...(hasVideo ? [{ id: 'Transcript' as BottomTab, Icon: AlignJustify, label: 'Transcript' }] : []),
        { id: 'Notes'      as BottomTab, Icon: Edit2,         label: 'Notes' },
        { id: 'PDF'        as BottomTab, Icon: FileText,      label: 'PDF' },
        { id: 'Doubt'      as BottomTab, Icon: MessageCircle, label: 'Doubt' },
      ];
    }
    return ordered;
  }, [moduleItems]);

    useEffect(() => {
    if (!autoScroll) return;
    if (bottomTab !== 'Transcript') return;
    if (!activeEntry) return;
    const key = `${activeEntry.segIdx}-${activeEntry.entIdx}`;
    const lineY = lineYsRef.current[key];
    if (typeof lineY !== 'number') return;
    // Compose absolute scroll Y: container offset + segment offset already on
    // the line. Subtract a third of the screen so the active line sits a bit
    // below the top, which feels more natural.
    const target = Math.max(0, transcriptContainerY.current + lineY - rs(120));
    scrollViewRef.current?.scrollTo?.({ y: target, animated: true });
  }, [activeEntry?.segIdx, activeEntry?.entIdx, autoScroll, bottomTab]);

  // Auto-select the first available tab if the active tab is not in the list.
  useEffect(() => {
    if (!dynamicTabs.find((t) => t.id === bottomTab)) {
      setBottomTab(dynamicTabs[0]?.id || 'Transcript');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicTabs.map((t) => t.id).join(',')]);

  // PDF items (admin-uploaded) for the current module — used by the PDF tab
  const pdfItems = moduleItems.filter((it: any) => it.type === 'pdf' && (it.pdf_url || it.title));

  const allSteps = allChapters.flatMap(ch => ch.steps.map(s => ({ ...s, chapterId: ch.id })));
  const currentIdx = allSteps.findIndex(s => s.id === currentStepId);
  const prevStep = currentIdx > 0 ? allSteps[currentIdx - 1] : null;
  const nextStep = currentIdx < allSteps.length - 1 ? allSteps[currentIdx + 1] : null;

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  // Fetch transcript for current step from backend
  useEffect(() => {
    let active = true;
    if (!courseId || !currentStepId) return;
    api.getStepTranscript(courseId, currentStepId)
      .then((res: any) => { if (active) setTranscriptEntries(res?.transcript || []); })
      .catch(() => { if (active) setTranscriptEntries([]); });
    return () => { active = false; };
  }, [courseId, currentStepId]);

  // Fetch the lesson video from backend (CloudFront / S3 / external).
  // Picks first match by chapter, falls back to course-level, then any video.
useEffect(() => {
    // Read video_url directly from course data — no API call needed
    const currentItem = moduleItems.find(
      (it: any) => it.id === currentStepId && it.type === 'video'
    );
    const url = currentItem?.video_url;
    if (url) {
      setVideoUrl(url);
    } else {
      setVideoUrl(FALLBACK_VIDEO_URL);
    }
    setVideoLoading(false);
  }, [currentStepId, moduleItems]);

  const goTo = (chId: string, sId: string) => {
    setCurrentChapterId(chId);
    setCurrentStepId(sId);
    // Auto-switch tab for non-video items so the user lands on the right
    // content (PDF preview / Doubt thread / Summary text) instead of an
    // empty video player.
    const newStep = chapter?.steps.find((s: any) => s.id === sId);
    const t = (newStep?.type || '').toLowerCase();
    if (t === 'pdf') setBottomTab('PDF');
    else if (t === 'doubt') setBottomTab('Doubt');
    else if (t === 'video' || !t) setBottomTab('Transcript');
  };
  const handleComplete = () => { if (!isCompleted) { completeStep(currentStepId, courseId); updateXP(10); Alert.alert('+10 XP earned', 'Step completed!'); } };
  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addNote({
      courseId, chapterId: currentChapterId, stepId: currentStepId,
      timestamp: selectedTimestamp ? toSec(selectedTimestamp) : undefined,
      content: noteText.trim(), type: 'typed',
    });
    setNoteText(''); setShowNoteInput(false); setSelectedTimestamp(null);
  };

  // Swipe-to-delete (RIGHT direction)
  const SwipeableNote: React.FC<{ note: any }> = ({ note }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const panResponder = useRef(PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => { if (g.dx > 0) translateX.setValue(Math.min(g.dx, 90)); },
      onPanResponderRelease: (_, g) => {
        if (g.dx > 60) {
          Animated.timing(translateX, { toValue: 90, duration: 150, useNativeDriver: true }).start(() => {
            setTimeout(() => deleteNote(note.id), 80);
          });
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })).current;

    return (
      <View style={{ marginBottom: rs(10), overflow: 'hidden', borderRadius: RADIUS.md }}>
        <View style={styles.swipeDeleteBg}>
          <View style={styles.swipeDeleteBtn}>
            <Trash2 size={rs(18)} color="#fff" strokeWidth={2} />
            <Text style={{ color: '#fff', fontSize: rf(11), marginTop: 2, fontWeight: '700' }}>Delete</Text>
          </View>
        </View>
        <Animated.View style={[styles.noteCard, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
          {note.timestamp !== undefined && (
            <View style={styles.noteTimestamp}>
              <Text style={styles.noteTimestampTxt}>@ {fmt(note.timestamp)}</Text>
            </View>
          )}
          <Text style={styles.noteContent}>{note.content}</Text>
          <Text style={styles.noteDate}>{new Date(note.createdAt).toLocaleDateString()}</Text>
        </Animated.View>
      </View>
    );
  };

  const TABS = dynamicTabs;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={{ maxWidth: isTablet ? contentMaxWidth : undefined, alignSelf: 'center', width: '100%', flex: 1 }}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.circleBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ChevronLeft size={rs(20)} color="#0d0d0d" strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: rs(10) }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{step?.title || 'Ch 2 Business Letters'}</Text>
            <Text style={styles.headerSub}>{(chapter?.title || 'PAPER - 1').toUpperCase()}</Text>
          </View>
          <TouchableOpacity style={styles.circleBtn} onPress={() => setShowSettings(true)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Settings size={rs(18)} color="#0d0d0d" strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {/* REAL VIDEO PLAYER — only for video steps; show placeholder otherwise */}
        {(step as any)?.type && (step as any).type !== 'video' ? (
          <View style={[isTablet ? { maxHeight: 360 } : { aspectRatio: 16 / 10 }, { backgroundColor: '#0d0d0d', alignItems: 'center', justifyContent: 'center', padding: rs(24) }]}>
            <View style={{ width: rs(56), height: rs(56), borderRadius: rs(28), backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: rs(12) }}>
              {(step as any).type === 'pdf' ? <FileText size={rs(28)} color="#fff" strokeWidth={1.6} /> :
               (step as any).type === 'doubt' ? <MessageCircle size={rs(28)} color="#fff" strokeWidth={1.6} /> :
               <AlignJustify size={rs(28)} color="#fff" strokeWidth={1.6} />}
            </View>
            <Text style={{ color: '#fff', fontSize: rf(15), fontWeight: '800', textAlign: 'center' }}>{((step as any).type || '').toUpperCase()} content</Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: rf(12), marginTop: rs(4), textAlign: 'center' }}>
              {(step as any).type === 'pdf' ? 'Open the PDF tab below to view or download.' :
               (step as any).type === 'doubt' ? 'Use the Doubt tab below to ask questions.' :
               'Open a tab below to view this content.'}
            </Text>
          </View>
        ) : (
          <VideoPlayer
            source={videoUrl}
            captionText={showCaptions && activeEntry ? activeEntry.text : ''}
            captionTopic={activeEntry?.topic}
            showCaptions={showCaptions}
            externalPaused={showSettings || showNoteInput}
            onTimeUpdate={(t) => setCurrentTime(t)}
            seekTo={seekRequest}
            autoPlay
            playbackRate={playbackRate}
            onPlaybackRateChange={setPlaybackRate}
            style={isTablet ? { maxHeight: 360 } : { aspectRatio: 16 / 10 }}
          />
        )}

        {/* TITLE ROW */}
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.lectureTitle}>{step?.title || 'Formal Letter part 2'}</Text>
           <Text style={styles.lectureFaculty}>Faculty: {course?.faculty?.name || 'Faculty'}</Text>
{/* FACULTY PROFILE CARD */}

          </View>
          <TouchableOpacity style={[styles.doneBtn, isCompleted && { backgroundColor: COLORS.green }]} onPress={handleComplete}>
            {isCompleted ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(4) }}>
                <CheckCircle size={rs(13)} color="#fff" strokeWidth={2.5} />
                <Text style={{ color: '#fff', fontSize: rf(11), fontWeight: '800' }}>Done</Text>
              </View>
            ) : (
              <Text style={{ color: '#fff', fontSize: rf(11), fontWeight: '800', textAlign: 'center' }}>Mark{'\n'}Done</Text>
            )}
          </TouchableOpacity>
        </View>
{course?.faculty && (
  <View style={{
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: rs(14), paddingVertical: rs(10),
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0',
    gap: rs(10),
  }}>
    <View style={{
      width: rs(40), height: rs(40), borderRadius: rs(20),
      backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: COLORS.primary,
    }}>
      <Text style={{ fontSize: rf(15), fontWeight: '900', color: COLORS.primary }}>
        {(course.faculty.name || 'F').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
      </Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: rf(13), fontWeight: '800', color: '#0d0d0d' }}>
        {course.faculty.name}
      </Text>
      <Text style={{ fontSize: rf(11), color: '#90a4ae' }}>
        {course.faculty.subject || 'Course Faculty'}
        {course.faculty.rating ? `  ⭐ ${course.faculty.rating}` : ''}
      </Text>
    </View>
    {course.faculty.students ? (
      <Text style={{ fontSize: rf(11), color: '#90a4ae', fontWeight: '600' }}>
        {(course.faculty.students / 1000).toFixed(0)}k students
      </Text>
    ) : null}
  </View>
)}
        {/* BOTTOM ICON TABS (toggleable via hamburger) */}
        {showTabs && (
        <View style={styles.bottomIconBar}>
          {TABS.map(({ id, Icon, label }) => {
            const active = bottomTab === id;
            return (
              <TouchableOpacity key={id} onPress={() => setBottomTab(id)} style={styles.bottomIconTab} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Icon size={rs(21)} color={active ? COLORS.primary : '#90a4ae'} strokeWidth={active ? 2.2 : 1.6} />
                <Text style={[styles.bottomIconLabel, active && { color: COLORS.primary, fontWeight: '800' }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        )}

        {/* CONTENT SCROLL — wrapped in KeyboardAvoidingView so the Notes
            and Doubt input fields aren't covered by the keyboard. */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? rs(80) : 0}
        >
        <ScrollView ref={scrollViewRef} style={{ flex: 1, backgroundColor: theme.bg }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: rs(40) }}>

          {/* TRANSCRIPT */}
            {bottomTab === 'Transcript' && (
            <View style={{ backgroundColor: theme.bg }} ref={transcriptScrollRef as any}
              onLayout={(e) => { transcriptContainerY.current = e.nativeEvent.layout.y; }}
            >
              {TRANSCRIPT_SEGMENTS.length === 0 && (
                <View style={{ alignItems: 'center', paddingVertical: rs(40) }}>
                  <AlignJustify size={rs(40)} color="#e0e0e0" strokeWidth={1.5} />
                  <Text style={{ color: '#90a4ae', marginTop: rs(10), fontSize: rf(14) }}>No transcript available for this lecture</Text>
                </View>
              )}
              {TRANSCRIPT_SEGMENTS.map((seg, si) => (
                <View key={si} style={[styles.transcriptSegment, { backgroundColor: theme.bg }]}>
                  <View style={[styles.topicHeader, { borderBottomColor: theme.border }]}>
                    <View style={styles.topicDot} />
                    <Text style={styles.topicTitle}>{seg.topic}</Text>
                    <Text style={[styles.topicTime, { color: theme.timeText }]}>{seg.timeStart} – {seg.timeEnd}</Text>
                  </View>
                  {seg.entries.map((entry, ei) => {
                    const isCurrent = activeEntry && activeEntry.segIdx === si && activeEntry.entIdx === ei;
                    const lineKey = `${si}-${ei}`;
                    return (
                      <TouchableOpacity key={ei}
                        onLayout={(e) => { lineYsRef.current[lineKey] = e.nativeEvent.layout.y; }}
                        onPress={() => {
                          const sec = toSec(entry.time);
                          setCurrentTime(sec);               // moves highlight instantly
                          setSeekRequest(sec + Math.random() * 0.001);  // triggers video seek
                        }}
                        onLongPress={() => { setSelectedTimestamp(entry.time); setBottomTab('Notes'); setShowNoteInput(true); }}
                        delayLongPress={350}
                        style={[styles.transcriptEntry, isCurrent && { backgroundColor: theme.highlightBg }]}
                        activeOpacity={0.7}>
                        <Text style={[styles.transcriptTime, { color: theme.timeText }, isCurrent && { color: theme.highlightTime, fontWeight: '800' }]}>{entry.time}</Text>
                        <Text style={[
                          styles.transcriptText,
                          { color: theme.text, fontSize: rf(fontSize), lineHeight: rf(fontSize) * lineSpacing },
                          isCurrent && { fontWeight: '700' },
                        ]}>{entry.text}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
              <View style={{ height: rs(20), backgroundColor: theme.bg }} />
            </View>
          )}

          {/* NOTES */}
          {bottomTab === 'Notes' && (
            <View style={{ padding: rs(14) }}>
              <TouchableOpacity style={styles.addNoteBtn} onPress={() => setShowNoteInput(true)}>
                <Plus size={rs(16)} color={COLORS.primary} strokeWidth={2.5} />
                <Text style={styles.addNoteBtnTxt}>Add a note (with or without timestamp)</Text>
              </TouchableOpacity>

              <View style={styles.noteHint}>
                <Lightbulb size={rs(14)} color="#f57f17" strokeWidth={2} />
                <Text style={styles.noteHintTxt}>Tap a transcript line to seek the video. Long-press to add a timestamped note. Swipe right to delete.</Text>
              </View>

              {stepNotes.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: rs(40) }}>
                  <Edit2 size={rs(40)} color="#e0e0e0" strokeWidth={1.5} />
                  <Text style={{ color: '#90a4ae', marginTop: rs(10), fontSize: rf(14) }}>No notes yet</Text>
                </View>
              ) : stepNotes.map(n => <SwipeableNote key={n.id} note={n} />)}

              <View style={{ height: rs(20) }} />
            </View>
          )}

          {/* PDF — dynamic from admin module items */}
          {bottomTab === 'PDF' && (
            <View style={{ padding: rs(14) }}>
              <View style={styles.pdfHeader}>
                <FileText size={rs(20)} color={COLORS.primary} strokeWidth={1.8} />
                <Text style={styles.pdfHeaderTitle}>{currentAdminModule?.title ? `${currentAdminModule.title} — Files` : 'Module Files'}</Text>
              </View>

              {pdfItems.length === 0 ? (
                <View style={{ alignItems: 'center', padding: rs(28) }}>
                  <FileText size={rs(38)} color="#cfd8dc" strokeWidth={1.5} />
                  <Text style={{ color: '#90a4ae', marginTop: rs(8), fontSize: rf(13), textAlign: 'center' }}>No PDFs added for this module yet.</Text>
                </View>
              ) : pdfItems.map((it: any, i: number) => {
                const publishAt = it.answer_sheet_publish_at;
                const answerReady = !!it.answer_sheet_url && (!publishAt || new Date(publishAt) <= new Date());
                const answerScheduled = !!it.answer_sheet_url && publishAt && new Date(publishAt) > new Date();
                const publishDateStr = publishAt
                  ? new Date(publishAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })
                  : '';
                return (
                  <View key={it.id || i} style={[styles.pdfPageCard, { flexDirection: 'column', alignItems: 'stretch', padding: rs(12), gap: rs(8) }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(10) }}>
                      <View style={styles.pdfPageNum}>
                        <Text style={{ color: COLORS.primary, fontSize: rf(14), fontWeight: '900' }}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pdfPageTitle} numberOfLines={2}>{it.title || `Document ${i + 1}`}</Text>
                        <Text style={styles.pdfPagePreview} numberOfLines={1}>PDF document</Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: rs(8), flexWrap: 'wrap' }}>
                      {it.pdf_url ? (
                        <TouchableOpacity
                          style={[styles.downloadBtn, { flex: 1, marginTop: 0 }]}
                          onPress={() => { setPdfPreviewItem({ url: it.pdf_url, title: it.title || `Document ${i + 1}` }); setShowPdfModal(true); }}
                          activeOpacity={0.85}>
                          <FileText size={rs(14)} color="#fff" strokeWidth={2} />
                          <Text style={{ color: '#fff', fontWeight: '800', fontSize: rf(12), marginLeft: rs(6) }}>Preview</Text>
                        </TouchableOpacity>
                      ) : null}

                      {answerReady && (
                        <TouchableOpacity
                          style={[styles.downloadBtn, { flex: 1, marginTop: 0, backgroundColor: COLORS.green }]}
                          onPress={() => { setPdfPreviewItem({ url: it.answer_sheet_url, title: `${it.title || ''} — Answer Sheet`.trim() }); setShowPdfModal(true); }}
                          activeOpacity={0.85}>
                          <CheckCircle size={rs(14)} color="#fff" strokeWidth={2} />
                          <Text style={{ color: '#fff', fontWeight: '800', fontSize: rf(12), marginLeft: rs(6) }}>Answer Sheet</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {answerScheduled && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(6), backgroundColor: '#fff8e1', padding: rs(8), borderRadius: RADIUS.sm }}>
                        <AlertCircle size={rs(13)} color="#f57f17" strokeWidth={2} />
                        <Text style={{ flex: 1, fontSize: rf(11), color: '#6d4c00', fontWeight: '600' }}>
                          Answer sheet will be available on {publishDateStr}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* DOUBT */}
          {bottomTab === 'Doubt' && (
            <View style={{ padding: rs(14) }}>
              {/* Header row with refresh */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: rs(10) }}>
                <Text style={{ fontSize: rf(13), fontWeight: '800', color: '#0d0d0d' }}>
                  My Doubts in this course ({courseDoubts.length})
                </Text>
                <TouchableOpacity
                  onPress={loadCourseDoubts}
                  disabled={doubtsRefreshing}
                  style={{ width: rs(34), height: rs(34), borderRadius: rs(17), backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.primary + '33' }}>
                  {doubtsRefreshing ? <ActivityIndicator size="small" color={COLORS.primary} /> : <RefreshCw size={rs(15)} color={COLORS.primary} strokeWidth={2.2} />}
                </TouchableOpacity>
              </View>

              {/* Ask new doubt CTA */}
              <TouchableOpacity style={styles.askDoubtCardBtn} onPress={() => setShowDoubtModal(true)}>
                <View style={styles.askDoubtIconWrap}>
                  <MessageCircle size={rs(22)} color={COLORS.primary} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.askDoubtTitle}>Ask a New Doubt</Text>
                  <Text style={styles.askDoubtSub}>Get expert mentor help for this topic</Text>
                </View>
                <ChevronRight size={rs(18)} color="#b0bec5" strokeWidth={2} />
              </TouchableOpacity>

              {/* Real doubts list */}
              {courseDoubts.length === 0 ? (
                <View style={{ alignItems: 'center', padding: rs(28) }}>
                  <MessageCircle size={rs(38)} color="#cfd8dc" strokeWidth={1.5} />
                  <Text style={{ color: '#90a4ae', marginTop: rs(8), fontSize: rf(13) }}>No doubts in this course yet — ask one!</Text>
                </View>
              ) : courseDoubts.map((d: any) => {
                const lastReply = (d.replies || [])[d.replies.length - 1];
                const mentor = lastReply?.by_role && lastReply.by_role !== 'student' ? lastReply.by : (course?.faculty?.name || 'Mentor');
                const previewText = lastReply ? (lastReply.content || (lastReply.image_url ? '📷 Image' : '')) : 'Awaiting reply…';
                const initials = (user?.name || 'You').split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();
                const t = d.createdAt ? new Date(d.createdAt) : null;
                const timeStr = t ? `${t.toLocaleDateString([], { day: '2-digit', month: 'short' })}, ${t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '';
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={styles.doubtCard}
                    activeOpacity={0.85}
                    onPress={() => {
                      onOpenDoubtChat && onOpenDoubtChat(
                        mentor,
                        d.topic || 'Subject Expert',
                        `${course?.title || ''} · ${d.topic || ''}`,
                        d.id,
                      );
                    }}>
                    <View style={styles.doubtCardHeader}>
                      <View style={styles.doubtAvatar}><Text style={{ color: '#fff', fontWeight: '800', fontSize: rf(12) }}>{initials}</Text></View>
                      <View style={{ flex: 1, marginLeft: rs(8) }}>
                        <Text style={{ fontSize: rf(13), fontWeight: '800', color: '#0d0d0d' }}>You</Text>
                        <Text style={{ fontSize: rf(11), color: '#90a4ae' }}>{timeStr}</Text>
                      </View>
                      {d.status === 'answered' ? (
                        <View style={styles.answeredBadge}>
                          <Text style={{ fontSize: rf(11), fontWeight: '800', color: COLORS.green }}>Answered</Text>
                        </View>
                      ) : (
                        <View style={[styles.answeredBadge, { backgroundColor: '#fff8e1' }]}>
                          <Text style={{ fontSize: rf(11), fontWeight: '800', color: '#f57f17' }}>Pending</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.doubtQuestion} numberOfLines={2}>Q. {d.question}</Text>
                    {lastReply && (
                      <View style={styles.mentorReplyBox}>
                        <View style={[styles.doubtAvatar, { backgroundColor: COLORS.primary }]}>
                          <Text style={{ color: '#fff', fontWeight: '800', fontSize: rf(10) }}>{(mentor || 'M').slice(0, 1).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: rs(8) }}>
                          <Text style={{ fontSize: rf(12), fontWeight: '800', color: '#0d0d0d' }}>{mentor}</Text>
                          <Text style={{ fontSize: rf(12), color: '#546e7a', lineHeight: rf(18), marginTop: rs(3) }} numberOfLines={2}>{previewText}</Text>
                        </View>
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: rs(8), gap: rs(4) }}>
                      <Text style={{ color: COLORS.primary, fontSize: rf(12), fontWeight: '700' }}>Open chat</Text>
                      <ChevronRight size={rs(14)} color={COLORS.primary} strokeWidth={2.5} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={{ height: rs(20) }} />
        </ScrollView>
        </KeyboardAvoidingView>

        {/* PREV/NEXT + BOOKMARK NAV */}
        <View style={[styles.navBar, { paddingBottom: Math.max(insets.bottom, rs(10)) }]}>
          <TouchableOpacity onPress={() => prevStep && goTo(prevStep.chapterId, prevStep.id)}
            style={[styles.navBtn, !prevStep && { opacity: 0.35 }]} disabled={!prevStep}>
            <ChevronLeft size={rs(16)} color="#546e7a" strokeWidth={2.5} />
            <Text style={styles.navBtnTxt}>PREV</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bookmarkBtn}
            onPress={() => setShowTabs(s => !s)}>
            <AlignJustify size={rs(18)} color={COLORS.primary} strokeWidth={2} />
            <Text style={styles.bookmarkTxt}>{showTabs ? 'Hide Tabs' : 'Show Tabs'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => nextStep && goTo(nextStep.chapterId, nextStep.id)}
            style={[styles.navBtn, !nextStep && { opacity: 0.35 }]} disabled={!nextStep}>
            <Text style={styles.navBtnTxt}>NEXT</Text>
            <ChevronRight size={rs(16)} color="#546e7a" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* SETTINGS MODAL */}
      <Modal visible={showSettings} animationType="slide" transparent onRequestClose={() => setShowSettings(false)}>
        <Pressable style={styles.settingsBackdrop} onPress={() => setShowSettings(false)}>
          <Pressable style={styles.settingsSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.settingsHandle} />
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 560 }}>
              {/* Note: Quality and Playback speed are controlled from the gear
                  icon inside the video player itself (top-right). This sheet
                  focuses on transcript / reader preferences. */}
              {/* Playback Speed — tap to cycle through 0.5×–2× */}
              <TouchableOpacity style={styles.sRow} onPress={cycleSpeed} activeOpacity={0.7}>
                <View style={styles.sIcon}><Gauge size={rs(16)} color="#546e7a" strokeWidth={1.8} /></View>
                <Text style={styles.sLabel}>Playback speed</Text>
                <View style={{ flex: 1 }} />
                <Text style={[styles.sValue, { color: COLORS.primary, fontWeight: '900' }]}>{playbackRate}×</Text>
                <ChevronRight size={rs(16)} color="#b0bec5" strokeWidth={2} />
              </TouchableOpacity>
              {/* Auto Scroll */}
              <View style={styles.sRow}>
                <View style={styles.sIcon}><ScrollText size={rs(16)} color="#546e7a" strokeWidth={1.8} /></View>
                <Text style={styles.sLabel}>Auto Scrolling</Text>
                <View style={{ flex: 1 }} />
                <TouchableOpacity
                  style={[styles.toggle, autoScroll && styles.toggleOn]}
                  onPress={() => setAutoScroll(!autoScroll)}>
                  <View style={[styles.toggleKnob, autoScroll && styles.toggleKnobOn]} />
                </TouchableOpacity>
              </View>
              {/* Language */}
              <View style={styles.sRow}>
                <View style={styles.sIcon}><Languages size={rs(16)} color="#546e7a" strokeWidth={1.8} /></View>
                <Text style={styles.sLabel}>Language</Text>
                <View style={{ flex: 1 }} />
                <Text style={styles.sValue}>{language}</Text>
                <ChevronRight size={rs(16)} color="#b0bec5" strokeWidth={2} />
              </View>

              {/* Font size stepper */}
              <View style={styles.stepperRow}>
                <Text style={styles.sLabel}>Font</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => setFontSize(Math.max(10, fontSize - 1))}>
                    <Text style={styles.stepBtnTxt}>A</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepValue}>{fontSize}</Text>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => setFontSize(Math.min(22, fontSize + 1))}>
                    <Text style={[styles.stepBtnTxt, { fontSize: rf(18) }]}>A</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Line spacing stepper */}
              <View style={styles.stepperRow}>
                <Text style={styles.sLabel}>Line Spacing</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => setLineSpacing(Math.max(1, +(lineSpacing - 0.25).toFixed(2)))}>
                    <Text style={styles.stepBtnTxt}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepValue}>{lineSpacing.toFixed(2)}</Text>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => setLineSpacing(Math.min(2.5, +(lineSpacing + 0.25).toFixed(2)))}>
                    <Text style={styles.stepBtnTxt}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Theme mode */}
              <Text style={styles.sectionLabel}>Theme</Text>
              <View style={styles.themeRow}>
                {[{ id: 'light', label: 'Light Mode', bg: '#fff', tc: '#0d0d0d', bc: '#e0e0e0' },
                  { id: 'brown', label: 'Brown Mode', bg: '#f5ecd7', tc: '#3e2723', bc: '#e0cfa8' },
                  { id: 'dark',  label: 'Dark Mode',  bg: '#1a1a1f', tc: '#fff',    bc: '#1a1a1f' }].map((t: any) => (
                  <TouchableOpacity key={t.id}
                    onPress={() => setThemeMode(t.id)}
                    style={[
                      styles.themeChip,
                      { backgroundColor: t.bg, borderColor: themeMode === t.id ? COLORS.primary : t.bc, borderWidth: themeMode === t.id ? 2 : 1.5 },
                    ]}>
                    <Text style={{ color: t.tc, fontWeight: '700', fontSize: rf(13) }}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Footer action row */}
              <View style={styles.settingsFooter}>
                <TouchableOpacity style={styles.footerCircle}>
                  <Captions size={rs(16)} color="#546e7a" strokeWidth={1.8} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.resetBtn} onPress={() => {
                  setThemeMode('light'); setFontSize(14); setLineSpacing(1.5); setAutoScroll(true); setLanguage('English');
                }}>
                  <Reset size={rs(14)} color="#546e7a" strokeWidth={2} />
                  <Text style={styles.resetBtnTxt}>Default Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.footerCircle} onPress={() => setShowSettings(false)}>
                  <AlertCircle size={rs(16)} color="#546e7a" strokeWidth={1.8} />
                </TouchableOpacity>
              </View>
              <View style={{ height: rs(10) }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* NOTE MODAL — popup over video so the field stays visible above the keyboard */}
      <Modal visible={showNoteInput} animationType="fade" transparent onRequestClose={() => { setShowNoteInput(false); setNoteText(''); setSelectedTimestamp(null); }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={styles.noteModalBackdrop} onPress={() => { setShowNoteInput(false); setNoteText(''); setSelectedTimestamp(null); }}>
            <Pressable style={styles.noteModalCard} onPress={() => {}}>
              <View style={styles.noteModalHeader}>
                <Text style={styles.noteModalTitle}>{selectedTimestamp ? 'Add Timestamped Note' : 'Add a Quick Note'}</Text>
                <TouchableOpacity onPress={() => { setShowNoteInput(false); setNoteText(''); setSelectedTimestamp(null); }} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <X size={rs(18)} color="#546e7a" strokeWidth={2} />
                </TouchableOpacity>
              </View>
              {selectedTimestamp ? (
                <View style={[styles.timestampChip, { alignSelf: 'flex-start', marginBottom: rs(8) }]}>
                  <Text style={styles.timestampChipTxt}>@ {selectedTimestamp}</Text>
                  <TouchableOpacity onPress={() => setSelectedTimestamp(null)} style={{ marginLeft: rs(6) }}>
                    <X size={rs(12)} color={COLORS.primary} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              ) : null}
              <TextInput
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Type your note here..."
                placeholderTextColor="#b0bec5"
                multiline
                autoFocus
                style={styles.noteModalInput}
              />
              <View style={{ flexDirection: 'row', gap: rs(8), marginTop: rs(12) }}>
                <TouchableOpacity onPress={() => { setShowNoteInput(false); setNoteText(''); setSelectedTimestamp(null); }}
                  style={[styles.noteActionBtn, { backgroundColor: '#f0f2f5', flex: 1 }]}>
                  <Text style={{ color: '#546e7a', fontWeight: '700', fontSize: rf(14) }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAddNote}
                  style={[styles.noteActionBtn, { backgroundColor: COLORS.primary, flex: 1 }]}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: rf(14) }}>Save Note</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={showPdfModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPdfModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
          <View style={styles.modalNavBar}>
            <TouchableOpacity onPress={() => setShowPdfModal(false)} style={styles.modalNavBtn}>
              <ChevronLeft size={rs(20)} color="#0d0d0d" strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={styles.modalNavTitle} numberOfLines={1}>{pdfPreviewItem?.title || 'Document'}</Text>
            <TouchableOpacity
              onPress={() => pdfPreviewItem?.url && Linking.openURL(pdfPreviewItem.url).catch(() => {})}
              style={styles.modalNavBtn}>
              <Download size={rs(18)} color={COLORS.primary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {pdfPreviewItem?.url ? (
            Platform.OS === 'web' ? (
              <View style={{ flex: 1 }}>
                {/* Web: use iframe via React Native Web */}
                {/* @ts-ignore */}
                <iframe
                  src={pdfPreviewItem.url}
                  style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
                  title={pdfPreviewItem.title || 'PDF'}
                />
              </View>
            ) : (
              <WebView
                source={{ uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfPreviewItem.url)}` }}
                style={{ flex: 1 }}
                startInLoadingState
                renderLoading={() => (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                  </View>
                )}
              />
            )
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: rs(24) }}>
              <FileText size={rs(48)} color="#cfd8dc" strokeWidth={1.5} />
              <Text style={{ color: '#90a4ae', marginTop: rs(8), fontSize: rf(13) }}>No PDF URL available.</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* DOUBT MODAL */}
      <Modal visible={showDoubtModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
          <View style={styles.modalNavBar}>
            <TouchableOpacity onPress={() => setShowDoubtModal(false)} style={styles.modalNavBtn}>
              <ChevronLeft size={rs(20)} color="#0d0d0d" strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={styles.modalNavTitle}>Ask a Doubt</Text>
            <View style={{ width: rs(36) }} />
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: rs(16) }} keyboardShouldPersistTaps="handled">
              {/* Context locked to current module/chapter */}
              <View style={styles.doubtContextBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(6) }}>
                  <Lightbulb size={rs(13)} color={COLORS.primary} strokeWidth={2} />
                  <Text style={styles.doubtContextLabel}>ASKING FOR</Text>
                </View>
                <Text style={styles.doubtContextCourse}>{course?.title}</Text>
                <Text style={styles.doubtContextChapter}>Module: {chapter?.title || 'Current chapter'}</Text>
                <Text style={styles.doubtContextLecture}>Lecture: {step?.title || 'Current lecture'}</Text>
              </View>

              <Text style={[styles.doubtFieldLabel, { marginTop: rs(16) }]}>Related topic</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: rs(8), marginBottom: rs(16) }}>
                {TRANSCRIPT_SEGMENTS.map((seg, i) => (
                  <TouchableOpacity key={i} onPress={() => setSelectedSubject(seg.topic)}
                    style={[styles.subjectChip, selectedSubject === seg.topic && styles.subjectChipActive]}>
                    <Text style={{ fontSize: rf(13), fontWeight: '600', color: selectedSubject === seg.topic ? '#fff' : '#546e7a' }}>{seg.topic}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.doubtFieldLabel}>Your Question *</Text>
              <TextInput
                value={doubtText} onChangeText={setDoubtText}
                placeholder="Type your doubt here to help mentors understand better..."
                placeholderTextColor="#b0bec5"
                multiline numberOfLines={5}
                style={styles.doubtInput}
              />
              <Text style={{ textAlign: 'right', fontSize: rf(12), color: '#90a4ae', marginBottom: rs(12) }}>
                {500 - doubtText.length} chars remaining
              </Text>

              <TouchableOpacity style={styles.attachBtn}>
                <Paperclip size={rs(16)} color="#546e7a" strokeWidth={1.8} />
                <Text style={{ fontSize: rf(13), color: '#546e7a', fontWeight: '600', marginLeft: rs(8) }}>Attach Screenshot</Text>
              </TouchableOpacity>

              <View style={styles.guidelinesBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(8) }}>
                  <AlertCircle size={rs(14)} color="#f57f17" strokeWidth={2} />
                  <Text style={{ fontSize: rf(13), fontWeight: '800', color: '#f57f17' }}>Community Guidelines</Text>
                </View>
                {['Be specific and clear', 'Check if already asked', 'Avoid posting exam papers', 'Be respectful'].map((g, i) => (
                  <Text key={i} style={styles.guidelineItem}>• {g}</Text>
                ))}
              </View>
            </ScrollView>

            <View style={[styles.doubtSubmitBar, { paddingBottom: Math.max(insets.bottom, rs(16)) }]}>
              <TouchableOpacity style={styles.backToVideoBtn2} onPress={() => setShowDoubtModal(false)}>
                <Play size={rs(14)} color={COLORS.primary} strokeWidth={2} fill={COLORS.primary} />
                <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: rf(13), marginLeft: rs(6) }}>Back to Video</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitDoubtBtn} onPress={async () => {
                if (!doubtText.trim()) return;
                try {
                  await api.askDoubt({
                    course_id: courseId,
                    chapter_id: currentChapterId,
                    topic: selectedSubject || chapter?.title || '',
                    question: doubtText.trim(),
                  });
                  setShowDoubtModal(false); setDoubtText('');
                  loadCourseDoubts();
                  Alert.alert('Doubt Submitted', 'A mentor will reply soon!');
                } catch (e: any) {
                  Alert.alert('Failed', e?.message || 'Could not submit doubt.');
                }
              }}>
                <Send size={rs(16)} color="#fff" strokeWidth={2} />
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: rf(14), marginLeft: rs(8) }}>Submit</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: rs(14), paddingVertical: rs(10),
    backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e8e8e8',
  },
  circleBtn: { width: rs(36), height: rs(36), borderRadius: rs(18), backgroundColor: '#f0f2f5', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: rf(15), fontWeight: '800', color: '#0d0d0d', letterSpacing: -0.2 },
  headerSub: { fontSize: rf(11), color: '#90a4ae', fontWeight: '600', letterSpacing: 0.5, marginTop: 1 },

  videoArea: { backgroundColor: '#0d1117', aspectRatio: 16 / 9, position: 'relative' },
  videoBg: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ctrlRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(32), top: '28%' },
  ctrlBtn: { width: rs(44), height: rs(44), borderRadius: rs(22), backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  ctrlLabel: { position: 'absolute', bottom: rs(4), fontSize: rf(9), color: '#fff', fontWeight: '800' },
  pauseBtn: { width: rs(56), height: rs(56), borderRadius: rs(28), backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  fullscreenBtn: { position: 'absolute', top: rs(10), right: rs(10), width: rs(30), height: rs(30), borderRadius: rs(6), backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },

  // Caption overlay
  captionWrap: { position: 'absolute', bottom: rs(46), left: 0, right: 0, alignItems: 'center', paddingHorizontal: rs(12) },
  captionBox: { backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: rs(8), paddingHorizontal: rs(12), paddingVertical: rs(6), maxWidth: '95%' },
  captionTopic: { fontSize: rf(9), color: '#7eb8ff', fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  captionText: { fontSize: rf(13), color: '#fff', textAlign: 'center', lineHeight: rf(18) },

  seekRow: { position: 'absolute', bottom: rs(22), left: rs(12) },
  seekTime: { color: '#fff', fontSize: rf(11), fontWeight: '600' },
  seekWrap: { position: 'absolute', bottom: rs(8), left: 0, right: 0, paddingHorizontal: rs(12) },
  seekBg: { height: rs(3), backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: rs(2), position: 'relative' },
  seekFill: { height: '100%', backgroundColor: '#e53935', borderRadius: rs(2) },
  seekThumb: { position: 'absolute', width: rs(12), height: rs(12), borderRadius: rs(6), backgroundColor: '#e53935', top: rs(-4.5), marginLeft: rs(-6) },

  titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(14), paddingVertical: rs(10), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0' },
  lectureTitle: { fontSize: rf(15), fontWeight: '900', color: '#0d0d0d', marginBottom: rs(3) },
  lectureFaculty: { fontSize: rf(12), color: '#90a4ae' },
  doneBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingHorizontal: rs(12), paddingVertical: rs(8), minWidth: rs(60), alignItems: 'center' },

  bottomIconBar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e8e8e8', paddingVertical: rs(8) },
  bottomIconTab: { flex: 1, alignItems: 'center', gap: rs(3), minHeight: rs(44), justifyContent: 'center' },
  bottomIconLabel: { fontSize: rf(11), color: '#90a4ae', fontWeight: '500' },

  transcriptSegment: { paddingHorizontal: rs(14), paddingTop: rs(14) },
  topicHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginBottom: rs(10), paddingBottom: rs(8), borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  topicDot: { width: rs(8), height: rs(8), borderRadius: rs(4), backgroundColor: COLORS.primary },
  topicTitle: { flex: 1, fontSize: rf(14), fontWeight: '800', color: COLORS.primary },
  topicTime: { fontSize: rf(11), color: '#90a4ae', fontWeight: '600' },
  transcriptEntry: { flexDirection: 'row', gap: rs(10), paddingVertical: rs(8), paddingHorizontal: rs(4), borderRadius: RADIUS.sm, marginBottom: rs(2) },
  transcriptEntryCurrent: { backgroundColor: '#e8eaf6' },
  transcriptTime: { fontSize: rf(12), color: '#90a4ae', fontWeight: '600', minWidth: rs(36), marginTop: rs(2) },
  transcriptText: { flex: 1, fontSize: rf(14), color: '#0d0d0d', lineHeight: rf(22) },
  transcriptTextCurrent: { color: COLORS.primary, fontWeight: '600' },

  addNoteBtn: { flexDirection: 'row', alignItems: 'center', gap: rs(8), backgroundColor: '#f0f2f5', borderRadius: RADIUS.md, padding: rs(14), marginBottom: rs(12), borderWidth: 1.5, borderColor: '#e0e0e0', borderStyle: 'dashed' },
  addNoteBtnTxt: { fontSize: rf(14), color: COLORS.primary, fontWeight: '600', flex: 1 },
  noteHint: { flexDirection: 'row', gap: rs(8), backgroundColor: '#fff8e1', borderRadius: RADIUS.md, padding: rs(12), marginBottom: rs(16), borderWidth: 1, borderColor: '#ffe082', alignItems: 'flex-start' },
  noteHintTxt: { flex: 1, fontSize: rf(12), color: '#f57f17', lineHeight: rf(18) },
  addNoteBox: { backgroundColor: '#f5f6fa', borderRadius: RADIUS.lg, padding: rs(14), marginBottom: rs(16), borderWidth: 1.5, borderColor: COLORS.primary },
  timestampChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryBg, borderRadius: RADIUS.full, paddingHorizontal: rs(10), paddingVertical: rs(4), alignSelf: 'flex-start', marginBottom: rs(8), borderWidth: 1, borderColor: COLORS.primary },
  timestampChipTxt: { fontSize: rf(12), color: COLORS.primary, fontWeight: '700' },
  noTimestampLabel: { fontSize: rf(11), color: '#90a4ae', fontWeight: '700', marginBottom: rs(8), letterSpacing: 0.5 },
  inlineNoteInput: { fontSize: rf(14), color: '#0d0d0d', minHeight: rs(80), textAlignVertical: 'top', paddingVertical: rs(4) },
  noteModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: rs(20) },
  noteModalCard: { width: '100%', maxWidth: rs(420), backgroundColor: '#fff', borderRadius: rs(16), padding: rs(16), shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  noteModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: rs(10) },
  noteModalTitle: { fontSize: rf(15), fontWeight: '900', color: '#0d0d0d' },
  noteModalInput: { fontSize: rf(15), color: '#0d0d0d', minHeight: rs(120), maxHeight: rs(220), textAlignVertical: 'top', padding: rs(12), backgroundColor: '#f5f6fa', borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#e0e0e0' },
  noteActionBtn: { borderRadius: RADIUS.md, paddingVertical: rs(12), alignItems: 'center' },
  swipeDeleteBg: { position: 'absolute', left: 0, top: 0, bottom: 0, width: rs(90), backgroundColor: COLORS.error, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  swipeDeleteBtn: { alignItems: 'center', justifyContent: 'center' },
  noteCard: { backgroundColor: '#fff', borderRadius: RADIUS.md, padding: rs(14), borderWidth: 1, borderColor: '#f0f0f0', ...SHADOWS.sm },
  noteTimestamp: { backgroundColor: COLORS.primaryBg, borderRadius: RADIUS.full, paddingHorizontal: rs(10), paddingVertical: rs(3), alignSelf: 'flex-start', marginBottom: rs(8), borderWidth: 1, borderColor: COLORS.primary },
  noteTimestampTxt: { fontSize: rf(12), color: COLORS.primary, fontWeight: '700' },
  noteContent: { fontSize: rf(14), color: '#0d0d0d', lineHeight: rf(20) },
  noteDate: { fontSize: rf(11), color: '#b0bec5', marginTop: rs(8) },

  pdfHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(10), marginBottom: rs(16) },
  pdfHeaderTitle: { fontSize: rf(16), fontWeight: '800', color: '#0d0d0d', flex: 1 },
  pdfPageCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: RADIUS.md, padding: rs(14), marginBottom: rs(10), gap: rs(12), borderWidth: 1, borderColor: '#f0f0f0', ...SHADOWS.sm },
  pdfPageNum: { width: rs(40), height: rs(40), borderRadius: rs(8), backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.primary },
  pdfPageTitle: { fontSize: rf(13), fontWeight: '800', color: '#0d0d0d', marginBottom: rs(3) },
  pdfPagePreview: { fontSize: rf(12), color: '#90a4ae', lineHeight: rf(17) },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: rs(13), marginTop: rs(8) },

  askDoubtCardBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: rs(14), marginBottom: rs(14), gap: rs(12), borderWidth: 1, borderColor: '#f0f0f0', ...SHADOWS.sm },
  askDoubtIconWrap: { width: rs(44), height: rs(44), borderRadius: rs(12), backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center' },
  askDoubtTitle: { fontSize: rf(14), fontWeight: '800', color: '#0d0d0d' },
  askDoubtSub: { fontSize: rf(12), color: '#90a4ae', marginTop: rs(2) },
  doubtCard: { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: rs(14), marginBottom: rs(12), borderWidth: 1, borderColor: '#f0f0f0', ...SHADOWS.sm },
  doubtCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: rs(10) },
  doubtAvatar: { width: rs(32), height: rs(32), borderRadius: rs(16), backgroundColor: '#546e7a', alignItems: 'center', justifyContent: 'center' },
  answeredBadge: { backgroundColor: '#e8f5e9', borderRadius: RADIUS.full, paddingHorizontal: rs(10), paddingVertical: rs(4), borderWidth: 1, borderColor: '#a5d6a7' },
  doubtQuestion: { fontSize: rf(13), color: '#0d0d0d', lineHeight: rf(20), marginBottom: rs(10) },
  mentorReplyBox: { flexDirection: 'row', backgroundColor: '#f5f6fa', borderRadius: RADIUS.md, padding: rs(10) },

  navBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: rs(16), paddingTop: rs(10), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e8e8e8' },
  navBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: rs(10), gap: rs(4), backgroundColor: '#f0f2f5', borderRadius: RADIUS.sm, borderWidth: 1, borderColor: '#e0e0e0' },
  navBtnTxt: { fontSize: rf(13), fontWeight: '800', color: '#546e7a', letterSpacing: 0.5 },
  navListBtn: { width: rs(44), height: rs(44), alignItems: 'center', justifyContent: 'center', marginHorizontal: rs(10) },
  bookmarkBtn: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginHorizontal: rs(10), paddingHorizontal: rs(14), paddingVertical: rs(10), backgroundColor: COLORS.primaryBg, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.primary },
  bookmarkTxt: { fontSize: rf(12), fontWeight: '800', color: COLORS.primary },

  // Settings sheet
  settingsBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  settingsSheet: { backgroundColor: '#fff', borderTopLeftRadius: rs(20), borderTopRightRadius: rs(20), paddingHorizontal: rs(16), paddingTop: rs(8), paddingBottom: rs(14) },
  settingsHandle: { alignSelf: 'center', width: rs(36), height: rs(4), borderRadius: rs(2), backgroundColor: '#d0d4db', marginBottom: rs(10) },
  sRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: rs(12), gap: rs(10), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e8e8e8' },
  sIcon: { width: rs(28), height: rs(28), alignItems: 'center', justifyContent: 'center' },
  sLabel: { fontSize: rf(14), fontWeight: '700', color: '#0d0d0d' },
  sValue: { fontSize: rf(13), color: '#90a4ae', fontWeight: '600', marginRight: rs(4) },
  toggle: { width: rs(40), height: rs(22), borderRadius: rs(11), backgroundColor: '#cfd8dc', justifyContent: 'center', paddingHorizontal: rs(2) },
  toggleOn: { backgroundColor: COLORS.primary },
  toggleKnob: { width: rs(18), height: rs(18), borderRadius: rs(9), backgroundColor: '#fff' },
  toggleKnobOn: { transform: [{ translateX: rs(18) }] },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f0f2f5', borderRadius: rs(12), paddingHorizontal: rs(14), paddingVertical: rs(10), marginTop: rs(10) },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: rs(10), paddingHorizontal: rs(4) },
  stepBtn: { paddingHorizontal: rs(14), paddingVertical: rs(6) },
  stepBtnTxt: { fontSize: rf(14), fontWeight: '800', color: '#0d0d0d' },
  stepValue: { fontSize: rf(14), fontWeight: '800', color: '#0d0d0d', minWidth: rs(36), textAlign: 'center' },
  sectionLabel: { fontSize: rf(12), fontWeight: '700', color: '#90a4ae', letterSpacing: 0.5, marginTop: rs(16), marginBottom: rs(8), textTransform: 'uppercase' },
  themeRow: { flexDirection: 'row', gap: rs(8) },
  themeChip: { flex: 1, paddingVertical: rs(12), borderRadius: rs(12), alignItems: 'center' },
  settingsFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: rs(18), gap: rs(10) },
  footerCircle: { width: rs(40), height: rs(40), borderRadius: rs(20), backgroundColor: '#f0f2f5', alignItems: 'center', justifyContent: 'center' },
  resetBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(6), backgroundColor: '#f0f2f5', borderRadius: rs(20), paddingVertical: rs(11) },
  resetBtnTxt: { fontSize: rf(13), fontWeight: '700', color: '#546e7a' },

  modalNavBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(14), paddingVertical: rs(12), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e8e8e8' },
  modalNavBtn: { width: rs(36), height: rs(36), borderRadius: rs(18), backgroundColor: '#f0f2f5', alignItems: 'center', justifyContent: 'center' },
  modalNavTitle: { flex: 1, textAlign: 'center', fontSize: rf(16), fontWeight: '800', color: '#0d0d0d', paddingHorizontal: rs(8) },

  pdfPagePreviewBox: { height: rs(160), backgroundColor: '#f5f6fa', borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', marginBottom: rs(16), borderWidth: 1, borderColor: '#e0e0e0' },
  pdfPreviewPageNum: { fontSize: rf(13), color: '#90a4ae', marginTop: rs(8) },
  pdfPreviewTitle: { fontSize: rf(18), fontWeight: '900', color: '#0d0d0d', marginBottom: rs(12) },
  pdfPreviewBody: { fontSize: rf(14), color: '#546e7a', lineHeight: rf(24) },
  pdfPageNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: rs(24), paddingTop: rs(16), borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  pdfNavBtn: { flexDirection: 'row', alignItems: 'center', gap: rs(4), paddingVertical: rs(10), paddingHorizontal: rs(16), backgroundColor: COLORS.primaryBg, borderRadius: RADIUS.md },
  pdfNavTxt: { fontSize: rf(13), fontWeight: '700', color: COLORS.primary },
  pdfPageCounter: { fontSize: rf(14), fontWeight: '800', color: '#0d0d0d' },
  backToVideoBar: { paddingHorizontal: rs(16), paddingTop: rs(12), borderTopWidth: 1, borderTopColor: '#f0f0f0', backgroundColor: '#fff' },
  backToVideoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: rs(13) },

  doubtFieldLabel: { fontSize: rf(13), fontWeight: '700', color: '#546e7a', marginBottom: rs(8) },
  doubtContextBox: { backgroundColor: COLORS.primaryBg, borderRadius: RADIUS.lg, padding: rs(14), borderWidth: 1.5, borderColor: COLORS.primary },
  doubtContextLabel: { fontSize: rf(10), fontWeight: '900', color: COLORS.primary, letterSpacing: 1 },
  doubtContextCourse: { fontSize: rf(15), fontWeight: '900', color: '#0d0d0d', marginBottom: rs(4) },
  doubtContextChapter: { fontSize: rf(12), color: '#546e7a', fontWeight: '600' },
  doubtContextLecture: { fontSize: rf(12), color: '#546e7a', fontWeight: '600', marginTop: rs(2) },
  subjectChip: { backgroundColor: '#f5f6fa', borderRadius: RADIUS.full, paddingHorizontal: rs(14), paddingVertical: rs(8), borderWidth: 1.5, borderColor: '#e0e0e0' },
  subjectChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  topicChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(8) },
  topicChip: { backgroundColor: COLORS.primaryBg, borderRadius: RADIUS.full, paddingHorizontal: rs(12), paddingVertical: rs(6), borderWidth: 1, borderColor: COLORS.primary },
  topicChipTxt: { fontSize: rf(12), color: COLORS.primary, fontWeight: '600' },
  doubtInput: { backgroundColor: '#f5f6fa', borderRadius: RADIUS.md, padding: rs(12), fontSize: rf(14), color: '#0d0d0d', textAlignVertical: 'top', minHeight: rs(120), borderWidth: 1.5, borderColor: '#e0e0e0', marginBottom: rs(8) },
  attachBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f6fa', borderRadius: RADIUS.md, padding: rs(12), marginBottom: rs(16), borderWidth: 1, borderColor: '#e0e0e0' },
  guidelinesBox: { backgroundColor: '#fff8e1', borderRadius: RADIUS.md, padding: rs(14), marginBottom: rs(20), borderWidth: 1, borderColor: '#ffe082' },
  guidelineItem: { fontSize: rf(12), color: '#546e7a', marginBottom: rs(4) },
  doubtSubmitBar: { flexDirection: 'row', gap: rs(10), paddingHorizontal: rs(16), paddingTop: rs(12), borderTopWidth: 1, borderTopColor: '#f0f0f0', backgroundColor: '#fff' },
  backToVideoBtn2: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: rs(12), paddingHorizontal: rs(16) },
  submitDoubtBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: rs(13) },
});
