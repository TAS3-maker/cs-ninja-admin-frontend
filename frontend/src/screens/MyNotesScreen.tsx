import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, KeyboardAvoidingView, Platform, Pressable, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, ChevronRight, Edit2, Trash2, FileText, Clock, Save, X, BookOpen, Plus } from 'lucide-react-native';
import { COLORS, RADIUS } from '../utils/theme';
import { rs, rf, isTablet, contentMaxWidth } from '../utils/responsive';
import { useProgress } from '../context/ProgressContext';
import { useCourses } from '../context/CoursesContext';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';

interface Props {
  onTabChange: (tab: string) => void;
  onCoursePress?: (courseId: string) => void;
}

const fmtTimestamp = (sec?: number) => {
  if (typeof sec !== 'number' || sec <= 0) return null;
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const MyNotesScreen: React.FC<Props> = ({ onTabChange, onCoursePress }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { progress, updateNote, deleteNote } = useProgress();
  const { courses } = useCourses();
  const [search, setSearch] = useState('');
  const [openCourse, setOpenCourse] = useState<Record<string, boolean>>({});
  const [openChapter, setOpenChapter] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<{ id: string; content: string } | null>(null);

  const enrolled = useMemo(() => courses.filter((c: any) => user?.enrolledCourses?.includes(c.id)), [courses, user?.enrolledCourses]);
  const courseById: Record<string, any> = useMemo(() => Object.fromEntries(enrolled.map((c) => [c.id, c])), [enrolled]);

  const buildLabel = (course: any, chapterId?: string, moduleId?: string, stepId?: string) => {
    if (!course) return { chapterTitle: 'Unknown', moduleTitle: '' };
    let chapterTitle = '', moduleTitle = '';
    for (const ch of (course.chapters || [])) {
      if (ch.id === chapterId) chapterTitle = ch.title;
      for (const mod of (ch.modules || [])) {
        if (mod.id === moduleId || (mod.items || []).some((it: any) => it.id === stepId)) {
          chapterTitle = chapterTitle || ch.title;
          moduleTitle = mod.title;
        }
      }
    }
    if (!chapterTitle) chapterTitle = 'General';
    return { chapterTitle, moduleTitle };
  };

  // Group notes: { courseId → { chapterTitle → [{ note, moduleTitle }] } }
  const grouped = useMemo(() => {
    const tree: Record<string, Record<string, { note: any; moduleTitle: string }[]>> = {};
    const filteredNotes = (progress.notes || []).filter((n: any) => {
      if (!search.trim()) return true;
      return (n.content || '').toLowerCase().includes(search.toLowerCase());
    });
    filteredNotes.forEach((n: any) => {
      const courseId = n.courseId || 'unknown';
      const course = courseById[courseId];
      const { chapterTitle, moduleTitle } = buildLabel(course, n.chapterId, n.moduleId, n.stepId);
      tree[courseId] = tree[courseId] || {};
      tree[courseId][chapterTitle] = tree[courseId][chapterTitle] || [];
      tree[courseId][chapterTitle].push({ note: n, moduleTitle });
    });
    return tree;
  }, [progress.notes, courseById, search]);

  const totalCount = (progress.notes || []).length;

  const onEdit = (note: any) => setEditing({ id: note.id, content: note.content });
  const onSaveEdit = async () => {
    if (!editing) return;
    if (!editing.content.trim()) { Alert.alert('Empty', 'Note cannot be empty'); return; }
    await updateNote(editing.id, editing.content.trim());
    setEditing(null);
  };
  const onDeleteNote = (note: any) => {
    Alert.alert('Delete note', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteNote(note.id) },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f6fa' }} edges={['top']}>
      <View style={{ flex: 1, maxWidth: isTablet ? contentMaxWidth : undefined, width: '100%', alignSelf: 'center' }}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Notes</Text>
          <Text style={styles.headerSub}>{totalCount} note{totalCount === 1 ? '' : 's'} across your courses</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search your notes…"
          placeholderTextColor="#90a4ae"
          style={styles.searchInput}
        />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: rs(14), paddingBottom: rs(120) }} showsVerticalScrollIndicator={false}>
        {totalCount === 0 ? (
          <View style={styles.emptyWrap}>
            <FileText size={rs(48)} color="#cfd8dc" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No notes yet</Text>
            <Text style={styles.emptySub}>Open any lesson and tap "+ Add a note" to capture insights.</Text>
          </View>
        ) : Object.entries(grouped).length === 0 ? (
          <View style={styles.emptyWrap}>
            <FileText size={rs(40)} color="#cfd8dc" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No matches</Text>
            <Text style={styles.emptySub}>Try a different search term.</Text>
          </View>
        ) : Object.entries(grouped).map(([courseId, chapters]) => {
          const course = courseById[courseId];
          const expanded = openCourse[courseId] !== false; // default open
          const chapterCount = Object.keys(chapters).length;
          const noteCount = Object.values(chapters).reduce((s: number, arr: any) => s + arr.length, 0);
          return (
            <View key={courseId} style={styles.courseCard}>
              <TouchableOpacity
                style={styles.courseHeader}
                onPress={() => setOpenCourse((x) => ({ ...x, [courseId]: !expanded }))}
                activeOpacity={0.85}>
                <View style={styles.courseIcon}><BookOpen size={rs(18)} color={COLORS.primary} strokeWidth={2} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.courseTitle} numberOfLines={1}>{course?.title || 'Other notes'}</Text>
                  <Text style={styles.courseMeta}>{chapterCount} chapter{chapterCount === 1 ? '' : 's'} · {noteCount} note{noteCount === 1 ? '' : 's'}</Text>
                </View>
                {expanded ? <ChevronDown size={rs(18)} color="#546e7a" /> : <ChevronRight size={rs(18)} color="#546e7a" />}
              </TouchableOpacity>
              {expanded && Object.entries(chapters).map(([chapterTitle, list]) => {
                const chapterKey = `${courseId}|${chapterTitle}`;
                const chOpen = openChapter[chapterKey] !== false;
                return (
                  <View key={chapterKey}>
                    <TouchableOpacity
                      style={styles.chapterRow}
                      onPress={() => setOpenChapter((x) => ({ ...x, [chapterKey]: !chOpen }))}
                      activeOpacity={0.85}>
                      {chOpen ? <ChevronDown size={rs(14)} color="#90a4ae" /> : <ChevronRight size={rs(14)} color="#90a4ae" />}
                      <Text style={styles.chapterTitle}>{chapterTitle}</Text>
                      <View style={styles.countPill}><Text style={styles.countPillTxt}>{list.length}</Text></View>
                    </TouchableOpacity>
                    {chOpen && list.map(({ note, moduleTitle }) => (
                      <View key={note.id} style={styles.noteCard}>
                        {moduleTitle ? <Text style={styles.noteModule}>{moduleTitle}</Text> : null}
                        <Text style={styles.noteContent}>{note.content}</Text>
                        <View style={styles.noteFooter}>
                          {fmtTimestamp(note.timestamp) && (
                            <View style={styles.timestampPill}>
                              <Clock size={rs(10)} color={COLORS.primary} strokeWidth={2.5} />
                              <Text style={styles.timestampPillTxt}>{fmtTimestamp(note.timestamp)}</Text>
                            </View>
                          )}
                          <Text style={styles.noteDate}>{new Date(note.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                          <View style={{ flex: 1 }} />
                          <TouchableOpacity onPress={() => onEdit(note)} style={styles.iconBtnSmall} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                            <Edit2 size={rs(14)} color={COLORS.primary} strokeWidth={2} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => onDeleteNote(note)} style={styles.iconBtnSmall} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                            <Trash2 size={rs(14)} color="#e53935" strokeWidth={2} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })}
              {course && onCoursePress && (
                <TouchableOpacity style={styles.openCourseBtn} onPress={() => onCoursePress(course.id)} activeOpacity={0.85}>
                  <Text style={styles.openCourseBtnTxt}>Open course →</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Edit Note Modal */}
      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.editBackdrop} onPress={() => setEditing(null)}>
            <Pressable style={styles.editCard} onPress={() => {}}>
              <View style={styles.editHeader}>
                <Text style={styles.editTitle}>Edit Note</Text>
                <TouchableOpacity onPress={() => setEditing(null)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <X size={rs(18)} color="#546e7a" strokeWidth={2} />
                </TouchableOpacity>
              </View>
              <TextInput
                value={editing?.content || ''}
                onChangeText={(t) => setEditing((e) => e ? { ...e, content: t } : e)}
                multiline
                autoFocus
                style={styles.editInput}
                placeholder="Edit your note…"
                placeholderTextColor="#b0bec5"
              />
              <View style={{ flexDirection: 'row', gap: rs(8), marginTop: rs(12) }}>
                <TouchableOpacity style={[styles.editBtn, { backgroundColor: '#f0f2f5', flex: 1 }]} onPress={() => setEditing(null)}>
                  <Text style={{ color: '#546e7a', fontWeight: '700', fontSize: rf(14) }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.editBtn, { backgroundColor: COLORS.primary, flex: 1 }]} onPress={onSaveEdit}>
                  <Save size={rs(14)} color="#fff" strokeWidth={2} />
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: rf(14), marginLeft: rs(6) }}>Save</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
      </View>

      <BottomNav active="notes" onChange={onTabChange} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: { paddingHorizontal: rs(16), paddingTop: rs(8), paddingBottom: rs(8) },
  headerTitle: { fontSize: rf(22), fontWeight: '900', color: '#0d0d0d' },
  headerSub: { fontSize: rf(12), color: '#90a4ae', marginTop: rs(2) },

  searchWrap: { paddingHorizontal: rs(16), marginBottom: rs(8) },
  searchInput: { backgroundColor: '#fff', borderRadius: RADIUS.md, paddingHorizontal: rs(14), paddingVertical: rs(10), fontSize: rf(14), borderWidth: 1, borderColor: '#e0e0e0', color: '#0d0d0d' },

  emptyWrap: { alignItems: 'center', paddingVertical: rs(60) },
  emptyTitle: { fontSize: rf(16), fontWeight: '800', color: '#546e7a', marginTop: rs(10) },
  emptySub: { fontSize: rf(12), color: '#90a4ae', marginTop: rs(4), textAlign: 'center', paddingHorizontal: rs(40) },

  courseCard: { backgroundColor: '#fff', borderRadius: RADIUS.lg, marginBottom: rs(12), overflow: 'hidden', borderWidth: 1, borderColor: '#e0e0e0' },
  courseHeader: { flexDirection: 'row', alignItems: 'center', padding: rs(14), gap: rs(10) },
  courseIcon: { width: rs(36), height: rs(36), borderRadius: rs(18), backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center' },
  courseTitle: { fontSize: rf(15), fontWeight: '800', color: '#0d0d0d' },
  courseMeta: { fontSize: rf(11), color: '#90a4ae', marginTop: rs(2) },

  chapterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(14), paddingVertical: rs(8), gap: rs(8), backgroundColor: '#f8f9fb', borderTopWidth: 1, borderTopColor: '#eef0f3' },
  chapterTitle: { flex: 1, fontSize: rf(13), fontWeight: '700', color: '#37474f' },
  countPill: { backgroundColor: '#e0e0e0', borderRadius: rs(10), paddingHorizontal: rs(8), paddingVertical: rs(2) },
  countPillTxt: { fontSize: rf(10), fontWeight: '800', color: '#546e7a' },

  noteCard: { paddingHorizontal: rs(14), paddingVertical: rs(10), borderTopWidth: 1, borderTopColor: '#eef0f3' },
  noteModule: { fontSize: rf(11), color: COLORS.primary, fontWeight: '800', marginBottom: rs(4), textTransform: 'uppercase', letterSpacing: 0.5 },
  noteContent: { fontSize: rf(14), color: '#0d0d0d', lineHeight: rf(20) },
  noteFooter: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginTop: rs(8) },
  timestampPill: { flexDirection: 'row', alignItems: 'center', gap: rs(3), backgroundColor: COLORS.primaryBg, paddingHorizontal: rs(6), paddingVertical: rs(2), borderRadius: rs(8) },
  timestampPillTxt: { fontSize: rf(10), fontWeight: '800', color: COLORS.primary },
  noteDate: { fontSize: rf(11), color: '#90a4ae' },
  iconBtnSmall: { width: rs(28), height: rs(28), borderRadius: rs(14), alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f6fa' },

  openCourseBtn: { borderTopWidth: 1, borderTopColor: '#eef0f3', paddingVertical: rs(10), alignItems: 'center' },
  openCourseBtnTxt: { fontSize: rf(12), fontWeight: '800', color: COLORS.primary },

  editBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: rs(20) },
  editCard: { width: '100%', maxWidth: rs(420), backgroundColor: '#fff', borderRadius: rs(16), padding: rs(16) },
  editHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: rs(10) },
  editTitle: { fontSize: rf(15), fontWeight: '900', color: '#0d0d0d' },
  editInput: { fontSize: rf(15), color: '#0d0d0d', minHeight: rs(120), maxHeight: rs(220), textAlignVertical: 'top', padding: rs(12), backgroundColor: '#f5f6fa', borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#e0e0e0' },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: rs(12), borderRadius: RADIUS.md },
});
