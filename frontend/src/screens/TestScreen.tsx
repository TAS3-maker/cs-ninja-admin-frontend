import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../utils/theme';
import { Bell, ClipboardList, FileText, ChevronDown, ChevronRight } from 'lucide-react-native';
import { BottomNav } from '../components/BottomNav';

interface Props {
  onBack?: () => void;
  onTabChange?: (tab: string) => void;
}

const papers = [
  { id: 'p1', title: 'Business Communication', type: 'Subjective', duration: '3 hrs', paper: 'Paper 1', locked: false },
  { id: 'p2', title: 'Fundamentals of Accounting', type: 'Subjective', duration: '3 hrs', paper: 'Paper 1', locked: false },
  { id: 'p3', title: 'Economic and Business Environment', type: 'Subjective', duration: '3 hrs', paper: 'Paper 1', locked: false },
  { id: 'p4', title: 'Business Laws & Management', type: 'Objective', duration: '2 hrs', paper: 'Paper 1', locked: false },
];

const sampleTests = [
  { id: 's1', title: 'CSEET Mock Test 1', questions: 100, marks: 100, duration: '60 min', attempted: true, score: 72 },
  { id: 's2', title: 'CSEET Mock Test 2', questions: 100, marks: 100, duration: '60 min', attempted: false },
  { id: 's3', title: 'Business Communication Full Test', questions: 50, marks: 50, duration: '30 min', attempted: false },
];

export const TestScreen: React.FC<Props> = ({ onTabChange }) => {
  const [activeTab, setActiveTab] = useState<'papers' | 'sample'>('papers');
  const [selectedCourse, setSelectedCourse] = useState('CSEET');

  const startTest = (test: any) => {
    Alert.alert('Start Test', `${test.title}\n${test.questions} Questions • ${test.marks} Marks • ${test.duration}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start Now', onPress: () => Alert.alert('Test Started', 'Quiz functionality coming soon!') },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.courseDropdown}>
          <Text style={styles.dropdownText}>{selectedCourse}</Text>
          <ChevronDown size={14} color="#546e7a" strokeWidth={2} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.bellBtn}><Bell size={18} color='#546e7a' strokeWidth={1.8} /></TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>4</Text>
          <Text style={styles.statLabel}>Papers</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: COLORS.primary }]}>50+</Text>
          <Text style={styles.statLabel}>Sample Tests</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity onPress={() => setActiveTab('papers')}
          style={[styles.tab, activeTab === 'papers' && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === 'papers' && styles.tabTextActive]}>Your Papers</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('sample')}
          style={[styles.tab, activeTab === 'sample' && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === 'sample' && styles.tabTextActive]}>Sample Tests</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {activeTab === 'papers' && (
          <View style={{ padding: SPACING.lg }}>
            {papers.map((p, i) => (
              <TouchableOpacity key={p.id} onPress={() => startTest({ title: p.title, questions: 100, marks: 100, duration: p.duration })}
                style={styles.paperCard}>
                <View style={styles.paperIcon}>
                  <ClipboardList size={18} color={COLORS.primary} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paperTitle}>{p.title}</Text>
                  <Text style={styles.paperMeta}>{p.paper} · {p.type} · {p.duration}</Text>
                </View>
                <ChevronRight size={16} color="#b0bec5" strokeWidth={2} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === 'sample' && (
          <View style={{ padding: SPACING.lg }}>
            {sampleTests.map(t => (
              <View key={t.id} style={styles.sampleCard}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                  <View style={styles.sampleIcon}>
                    <FileText size={18} color={COLORS.primary} strokeWidth={1.8} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sampleTitle}>{t.title}</Text>
                    <Text style={styles.sampleMeta}>{t.questions} Questions · {t.marks} Marks · {t.duration}</Text>
                  </View>
                  {t.attempted && (
                    <View style={styles.scoreBadge}>
                      <Text style={{ color: COLORS.green, fontWeight: '800', fontSize: 13 }}>{t.score}%</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity style={[styles.startBtn, t.attempted && styles.reattemptBtn]}
                  onPress={() => startTest(t)}>
                  <Text style={[styles.startBtnText, t.attempted && { color: COLORS.primary }]}>
                    {t.attempted ? 'Re-attempt' : 'Start Test'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <BottomNav active="test" onChange={(t) => onTabChange && onTabChange(t)} />
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
  dropdownText: { fontSize: 14, fontWeight: '800', color: '#0d0d0d' },
  bellBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#f5f6fa', alignItems: 'center', justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    marginHorizontal: SPACING.lg, marginTop: SPACING.md,
    borderRadius: RADIUS.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: '#f0f0f0', ...SHADOWS.sm,
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statNum: { fontSize: 28, fontWeight: '900', color: '#0d0d0d' },
  statLabel: { fontSize: 12, color: '#90a4ae', fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },
  tabRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    marginHorizontal: SPACING.lg, marginTop: SPACING.md,
    borderRadius: RADIUS.lg, padding: 4,
    borderWidth: 1, borderColor: '#f0f0f0',
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.md },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: '#90a4ae' },
  tabTextActive: { color: '#fff', fontWeight: '800' },
  paperCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: RADIUS.md,
    padding: 14, gap: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#f0f0f0', ...SHADOWS.sm,
  },
  paperIcon: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: '#e8eaf6', alignItems: 'center', justifyContent: 'center',
  },
  paperTitle: { fontSize: 14, fontWeight: '800', color: '#0d0d0d', marginBottom: 3 },
  paperMeta: { fontSize: 12, color: '#90a4ae' },
  sampleCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#f0f0f0', ...SHADOWS.sm,
  },
  sampleIcon: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: '#e8eaf6', alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  sampleTitle: { fontSize: 14, fontWeight: '800', color: '#0d0d0d', marginBottom: 3 },
  sampleMeta: { fontSize: 12, color: '#90a4ae' },
  scoreBadge: {
    backgroundColor: '#e8f5e9', borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#a5d6a7',
  },
  startBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.sm,
    paddingVertical: 10, alignItems: 'center',
  },
  reattemptBtn: { backgroundColor: '#e8eaf6' },
  startBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
