import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ShoppingCart, Search, SlidersHorizontal, X, ChevronDown, ChevronRight, Star, Check, ArrowUpDown, GraduationCap, Languages } from 'lucide-react-native';
import { useCourses } from '../context/CoursesContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../utils/theme';
import { rs, rf, isTablet, contentMaxWidth, contentPadH, gridCols } from '../utils/responsive';

interface Props { onBack: () => void; onCoursePress: (courseId: string) => void; onWatchDemo: () => void; }

const LEVELS = ['All', 'CSEET', 'Executive', 'Professional'];
const LANGUAGES = ['All', 'Hindi', 'English', 'Hindi + English'];
const SORT_OPTIONS = ['Popularity', 'Price: Low to High', 'Price: High to Low', 'Rating', 'Newest'];

export const AllCoursesScreen: React.FC<Props> = ({ onBack, onCoursePress, onWatchDemo }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [selectedLang, setSelectedLang] = useState('All');
  const [sortBy, setSortBy] = useState('Popularity');
  const [showFilter, setShowFilter] = useState(false);
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);

  const { courses: COURSES } = useCourses();
  const filtered = COURSES.filter(c => {
    const matchLevel = selectedLevel === 'All' || c.category.toLowerCase() === selectedLevel.toLowerCase() || c.category.toLowerCase().includes(selectedLevel.toLowerCase());
    const matchLang = selectedLang === 'All' || c.language.includes(selectedLang);
    const matchSearch = !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.faculty.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchLevel && matchLang && matchSearch;
  }).sort((a, b) => {
    if (sortBy === 'Price: Low to High') return a.price - b.price;
    if (sortBy === 'Price: High to Low') return b.price - a.price;
    if (sortBy === 'Rating') return b.rating - a.rating;
    return b.students - a.students;
  });

  const activeFiltersCount = (selectedLevel !== 'All' ? 1 : 0) + (selectedLang !== 'All' ? 1 : 0) + (sortBy !== 'Popularity' ? 1 : 0);

  const CourseCard: React.FC<{ course: any }> = ({ course }) => {
    const cat = String(course?.category || 'CR').toUpperCase();
    const tagsLine = (Array.isArray(course?.tags) && course.tags.length ? course.tags : [course?.language, course?.level].filter(Boolean)).slice(0, 2).join(' • ');
    const facName = course?.faculty?.name || course?.faculty_name || 'Faculty';
    const price = Number(course?.price) || 0;
    const orig = Number(course?.originalPrice) || price;
    const rating = Number(course?.rating) || 4.8;
    const reviewCount = Number(course?.reviewCount) || 0;
    return (
      <TouchableOpacity onPress={() => onCoursePress(course.id)} style={styles.courseCard} activeOpacity={0.9}>
        <LinearGradient colors={['#1a237e', '#283593']} style={styles.courseCardBanner}>
          <View style={styles.courseTag}>
            <Text style={{ color: '#ffcc02', fontSize: rf(10), fontWeight: '800' }}>June 2026 Attempt</Text>
          </View>
          <Text style={styles.courseCardCat}>{cat}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: rf(11), marginTop: rs(2) }}>{tagsLine}</Text>
          {course?.isBestseller && (
            <View style={styles.bestsellerTag}><Text style={{ color: '#ff6f00', fontSize: rf(10), fontWeight: '800' }}>BESTSELLER</Text></View>
          )}
        </LinearGradient>
        <View style={styles.courseCardBody}>
          <Text style={styles.courseCardTitle} numberOfLines={2}>{course?.title || 'Course'}</Text>
          <Text style={styles.courseCardFaculty}>{facName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(4), marginTop: rs(4) }}>
            <Star size={rs(12)} color="#f57f17" strokeWidth={0} fill="#f57f17" />
            <Text style={{ fontSize: rf(12), fontWeight: '700', color: '#0d0d0d' }}>{rating.toFixed(1)}</Text>
            <Text style={{ fontSize: rf(11), color: '#90a4ae' }}>({reviewCount.toLocaleString()})</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(8), marginTop: rs(6) }}>
            <Text style={styles.coursePrice}>₹{price.toLocaleString()}</Text>
            {orig > price ? <Text style={styles.courseStrike}>₹{orig.toLocaleString()}</Text> : null}
          </View>
          <TouchableOpacity style={styles.enrollBtn} onPress={() => onCoursePress(course.id)}>
            <Text style={styles.enrollBtnTxt}>Enroll Now</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f6fa' }} edges={['top']}>
      <View style={{ maxWidth: isTablet ? contentMaxWidth : undefined, alignSelf: 'center', width: '100%', flex: 1 }}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ChevronLeft size={rs(20)} color="#0d0d0d" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Our Courses</Text>
          <TouchableOpacity style={styles.headerBtn}>
            <ShoppingCart size={rs(20)} color="#546e7a" strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={rs(16)} color="#90a4ae" strokeWidth={1.8} />
            <TextInput
              value={searchQuery} onChangeText={setSearchQuery}
              placeholder="Search courses, faculty..."
              placeholderTextColor="#b0bec5"
              style={styles.searchInput}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={rs(16)} color="#90a4ae" strokeWidth={2} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity style={[styles.filterBtn, activeFiltersCount > 0 && styles.filterBtnActive]} onPress={() => setShowFilter(true)}>
            <SlidersHorizontal size={rs(18)} color={activeFiltersCount > 0 ? '#fff' : COLORS.primary} strokeWidth={2} />
            {activeFiltersCount > 0 && (
              <View style={styles.filterBadge}><Text style={{ color: '#fff', fontSize: rf(10), fontWeight: '900' }}>{activeFiltersCount}</Text></View>
            )}
          </TouchableOpacity>
        </View>

        {/* Level quick filters */}
        <View style={styles.levelChipsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.levelChips}>
            {LEVELS.map(l => (
              <TouchableOpacity key={l} onPress={() => setSelectedLevel(l)}
                style={[styles.levelChip, selectedLevel === l && styles.levelChipActive]}>
                <Text style={[styles.levelChipTxt, selectedLevel === l && { color: '#fff' }]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Results count */}
        <View style={styles.resultsRow}>
          <Text style={styles.resultsCount}>{filtered.length} course{filtered.length !== 1 ? 's' : ''} found</Text>
          <View style={styles.sortIndicator}>
            <Text style={styles.sortIndicatorTxt}>Sorted by {sortBy}</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={styles.courseGrid}>
            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Search size={rs(48)} color="#e0e0e0" strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>No courses found</Text>
                <Text style={styles.emptySub}>Try adjusting your filters</Text>
                <TouchableOpacity onPress={() => { setSelectedLevel('All'); setSelectedLang('All'); setSearchQuery(''); }}>
                  <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: rf(14) }}>Clear Filters</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.grid, isTablet && styles.gridTablet]}>
                {filtered.map(c => <CourseCard key={c.id} course={c} />)}
              </View>
            )}
          </View>
          <View style={{ height: rs(32) }} />
        </ScrollView>

        {/* Filter Modal — clean list layout */}
        <Modal visible={showFilter} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowFilter(false)} style={styles.modalCloseBtn}>
                <X size={rs(20)} color="#0d0d0d" strokeWidth={2} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Filter & Sort</Text>
              <TouchableOpacity onPress={() => { setSelectedLevel('All'); setSelectedLang('All'); setSortBy('Popularity'); }}>
                <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: rf(13) }}>Reset</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }}>
              {/* Sort section */}
              <View style={styles.fSection}>
                <View style={styles.fSectionHeader}>
                  <ArrowUpDown size={rs(16)} color={COLORS.primary} strokeWidth={2} />
                  <Text style={styles.fSectionTitle}>Sort By</Text>
                </View>
                {SORT_OPTIONS.map(s => (
                  <TouchableOpacity key={s} onPress={() => setSortBy(s)} style={styles.fRow}>
                    <Text style={[styles.fRowText, sortBy === s && { color: COLORS.primary, fontWeight: '800' }]}>{s}</Text>
                    <View style={[styles.fRadio, sortBy === s && styles.fRadioActive]} />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Level section */}
              <View style={styles.fSection}>
                <View style={styles.fSectionHeader}>
                  <GraduationCap size={rs(16)} color={COLORS.primary} strokeWidth={2} />
                  <Text style={styles.fSectionTitle}>CS Level</Text>
                </View>
                {LEVELS.map(l => (
                  <TouchableOpacity key={l} onPress={() => setSelectedLevel(l)} style={styles.fRow}>
                    <Text style={[styles.fRowText, selectedLevel === l && { color: COLORS.primary, fontWeight: '800' }]}>{l}</Text>
                    <View style={[styles.fRadio, selectedLevel === l && styles.fRadioActive]} />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Language section */}
              <View style={styles.fSection}>
                <View style={styles.fSectionHeader}>
                  <Languages size={rs(16)} color={COLORS.primary} strokeWidth={2} />
                  <Text style={styles.fSectionTitle}>Language</Text>
                </View>
                {LANGUAGES.map(l => (
                  <TouchableOpacity key={l} onPress={() => setSelectedLang(l)} style={styles.fRow}>
                    <Text style={[styles.fRowText, selectedLang === l && { color: COLORS.primary, fontWeight: '800' }]}>{l}</Text>
                    <View style={[styles.fRadio, selectedLang === l && styles.fRadioActive]} />
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ height: rs(20) }} />
            </ScrollView>

            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.applyFilterBtn} onPress={() => setShowFilter(false)}>
                <Text style={styles.applyFilterBtnTxt}>Show {filtered.length} result{filtered.length !== 1 ? 's' : ''}</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: contentPadH, paddingVertical: rs(12), backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e0e0e0' },
  headerBtn: { width: rs(36), height: rs(36), borderRadius: rs(18), backgroundColor: '#f0f2f5', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: rf(17), fontWeight: '800', color: '#0d0d0d' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: rs(10), padding: contentPadH, backgroundColor: '#fff' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: rs(10), backgroundColor: '#f0f2f5', borderRadius: RADIUS.full, paddingHorizontal: rs(14), height: rs(44), borderWidth: 1, borderColor: '#e0e0e0' },
  searchInput: { flex: 1, fontSize: rf(14), color: '#0d0d0d' },
  filterBtn: { width: rs(44), height: rs(44), borderRadius: rs(12), backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.primary, position: 'relative' },
  filterBtnActive: { backgroundColor: COLORS.primary },
  filterBadge: { position: 'absolute', top: -rs(4), right: -rs(4), width: rs(16), height: rs(16), borderRadius: rs(8), backgroundColor: COLORS.error, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  levelChipsWrap: { backgroundColor: '#fff', paddingVertical: rs(10), maxHeight: rs(56) },
  levelChips: { gap: rs(8), paddingHorizontal: contentPadH, alignItems: 'center' },
  levelChip: { backgroundColor: '#f0f2f5', borderRadius: RADIUS.full, paddingHorizontal: rs(16), paddingVertical: rs(8), borderWidth: 1.5, borderColor: '#e0e0e0', alignSelf: 'flex-start' },
  levelChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  levelChipTxt: { fontSize: rf(13), fontWeight: '700', color: '#546e7a' },
  sortIndicator: { backgroundColor: '#f5f6fa', borderRadius: RADIUS.full, paddingHorizontal: rs(10), paddingVertical: rs(4) },
  sortIndicatorTxt: { fontSize: rf(12), color: '#546e7a', fontWeight: '600' },
  resultsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: contentPadH, paddingVertical: rs(10) },
  resultsCount: { fontSize: rf(13), color: '#546e7a', fontWeight: '600' },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: rs(4) },
  sortBtnTxt: { fontSize: rf(13), color: COLORS.primary, fontWeight: '700' },
  courseGrid: { paddingHorizontal: contentPadH },
  grid: { gap: rs(14) },
  gridTablet: { flexDirection: 'row', flexWrap: 'wrap' },
  emptyState: { alignItems: 'center', paddingVertical: rs(60), gap: rs(10) },
  emptyTitle: { fontSize: rf(18), fontWeight: '800', color: '#0d0d0d' },
  emptySub: { fontSize: rf(14), color: '#90a4ae' },
  courseCard: { backgroundColor: '#fff', borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: '#f0f0f0', ...(isTablet ? { width: '48%' } : {}) },
  courseCardBanner: { height: rs(120), padding: rs(14), justifyContent: 'flex-end', position: 'relative' },
  courseTag: { position: 'absolute', top: rs(10), left: rs(10), backgroundColor: 'rgba(255,204,2,0.15)', borderRadius: RADIUS.full, paddingHorizontal: rs(8), paddingVertical: rs(3), borderWidth: 1, borderColor: 'rgba(255,204,2,0.3)' },
  courseCardCat: { fontSize: rf(24), fontWeight: '900', color: '#fff', letterSpacing: 1 },
  bestsellerTag: { position: 'absolute', top: rs(10), right: rs(10), backgroundColor: '#fff3e0', borderRadius: RADIUS.full, paddingHorizontal: rs(8), paddingVertical: rs(3) },
  courseCardBody: { padding: rs(14) },
  courseCardTitle: { fontSize: rf(14), fontWeight: '800', color: '#0d0d0d', lineHeight: rf(19), marginBottom: rs(4) },
  courseCardFaculty: { fontSize: rf(12), color: '#546e7a' },
  coursePrice: { fontSize: rf(17), fontWeight: '900', color: COLORS.primary },
  courseStrike: { fontSize: rf(12), color: '#90a4ae', textDecorationLine: 'line-through' },
  enrollBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingVertical: rs(10), alignItems: 'center', marginTop: rs(10) },
  enrollBtnTxt: { color: '#fff', fontWeight: '800', fontSize: rf(14) },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: rs(16), paddingVertical: rs(14), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e0e0e0' },
  modalTitle: { fontSize: rf(17), fontWeight: '800', color: '#0d0d0d' },
  modalCloseBtn: { width: rs(36), height: rs(36), borderRadius: rs(18), backgroundColor: '#f0f2f5', alignItems: 'center', justifyContent: 'center' },
  filterSectionTitle: { fontSize: rf(15), fontWeight: '800', color: '#0d0d0d', marginBottom: rs(12) },
  filterChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(10) },
  filterChip: { backgroundColor: '#f0f2f5', borderRadius: RADIUS.full, paddingHorizontal: rs(16), paddingVertical: rs(9), borderWidth: 1.5, borderColor: '#e0e0e0' },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipTxt: { fontSize: rf(13), fontWeight: '700', color: '#546e7a' },
  filterActions: { flexDirection: 'row', gap: rs(12), padding: rs(16), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e0e0e0' },
  resetBtn: { flex: 1, borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: RADIUS.md, paddingVertical: rs(13), alignItems: 'center' },
  resetBtnTxt: { fontSize: rf(15), fontWeight: '700', color: '#546e7a' },
  applyFilterBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: rs(14), alignItems: 'center' },
  applyFilterBtnTxt: { fontSize: rf(15), fontWeight: '800', color: '#fff' },

  // Cleaner filter list styles
  fSection: { marginTop: rs(8), paddingHorizontal: rs(16) },
  fSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(8), paddingVertical: rs(12), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e0e0e0' },
  fSectionTitle: { fontSize: rf(13), fontWeight: '900', color: COLORS.primary, letterSpacing: 0.5, textTransform: 'uppercase' },
  fRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: rs(14), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f5f6fa' },
  fRowText: { fontSize: rf(14), color: '#0d0d0d', fontWeight: '600' },
  fRadio: { width: rs(20), height: rs(20), borderRadius: rs(10), borderWidth: 2, borderColor: '#cfd8dc' },
  fRadioActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary, borderWidth: 6 },
});
