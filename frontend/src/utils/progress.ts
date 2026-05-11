/**
 * Course completion percentage helpers
 * Single source of truth for progress math used in dashboard, course-detail
 * and learning screens.
 */

interface AnyCourse { modules?: any[]; chapters?: any[] }

/**
 * Collect all step / item ids in a course (legacy modules[] preferred,
 * fallback to admin chapters[].modules[].items[]).
 */
export const collectStepIds = (course?: AnyCourse | null): string[] => {
  if (!course) return [];
  const ids: string[] = [];

  // Legacy schema: modules[] -> chapters[] -> steps[]
  for (const m of (course.modules || [])) {
    for (const ch of (m.chapters || [])) {
      for (const s of (ch.steps || [])) {
        if (s?.id) ids.push(s.id);
      }
    }
  }
  if (ids.length > 0) return ids;

  // Admin schema fallback: chapters[] -> modules[] -> items[]
  for (const ch of (course.chapters || [])) {
    for (const m of (ch.modules || [])) {
      for (const it of (m.items || [])) {
        if (it?.id) ids.push(it.id);
      }
    }
  }
  return ids;
};

export const computeCourseProgress = (
  course?: AnyCourse | null,
  completedSteps: string[] = []
): number => {
  const ids = collectStepIds(course);
  if (ids.length === 0) return 0;
  const set = new Set(completedSteps);
  let done = 0;
  for (const id of ids) if (set.has(id)) done++;
  return Math.round((done / ids.length) * 100);
};
