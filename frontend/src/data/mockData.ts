/**
 * Static UI metadata only.
 *
 * Real catalog data (COURSES, FACULTIES, EXPERTS) now comes from the backend
 * via `useCourses()` from `../context/CoursesContext`.
 *
 * Imports of `MOCK_USER`, `COURSES`, `FACULTIES` from this file have been
 * replaced across the app — keep this list minimal.
 */
export const CATEGORIES = [
  { id: 'cseet',        label: 'CSEET',        icon: '📘', color: '#0066FF' },
  { id: 'executive',    label: 'Executive',    icon: '⚖️', color: '#7B2FFF' },
  { id: 'professional', label: 'Professional', icon: '🏛️', color: '#FF6B35' },
  { id: 'foundation',   label: 'Foundation',   icon: '🎓', color: '#00C48C' },
];
