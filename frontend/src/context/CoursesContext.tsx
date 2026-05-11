/**
 * CoursesContext — fetches catalog data from the live backend
 * (/api/courses, /api/faculties, /api/experts) and exposes it via a hook.
 *
 * Replaces the static arrays previously imported from data/mockData.
 */
import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import api from '../services/api';

export interface Course {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  faculty?: { id?: string; name: string; subject: string; rating?: number; students?: number; avatar?: string | null };
  price: number;
  originalPrice?: number;
  rating?: number;
  reviewCount?: number;
  students?: number;
  duration?: string;
  language?: string;
  level?: string;
  isBestseller?: boolean;
  isTrending?: boolean;
  thumbnail?: string;
  tags?: string[];
  startDate?: string;
  expiryDate?: string;
  description?: string;
  highlights?: string[];
  modules?: any[];
  chapters?: any[];   // admin schema (admin-created courses may have this instead of modules)
  [key: string]: any;
}

interface Faculty { id: string; name: string; subject?: string; rating?: number; students?: number; bio?: string; avatar?: string | null }
interface Expert { id: string; name: string; title?: string; bio?: string; expertise?: string[]; avatar?: string | null }

interface CoursesCtx {
  courses: Course[];
  faculties: Faculty[];
  experts: Expert[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getCourse: (id: string) => Course | undefined;
}

const Ctx = createContext<CoursesCtx | null>(null);

export const CoursesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [courses, setCourses]     = useState<Course[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [experts, setExperts]     = useState<Expert[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Normalize raw API course rows so every UI screen can rely on the same
  // shape. Admin-created courses may lack `tags`, `faculty`, `originalPrice`,
  // etc. — we fill safe defaults so accessing them never crashes.
  const normalizeCourse = (raw: any, faculties: Faculty[]): Course => {
    const facultyId = Array.isArray(raw?.faculty_ids) ? raw.faculty_ids[0] : null;
    const facultyDoc = (raw?.faculty && typeof raw.faculty === 'object')
      ? raw.faculty
      : (facultyId ? faculties.find((f: any) => f.id === facultyId) : null);
    const facultyName = facultyDoc?.name || raw?.faculty_name || 'Faculty';
    const price = Number(raw?.price) || 0;
    const orig = Number(raw?.originalPrice ?? raw?.original_price) || price;
    return {
      ...raw,
      category: raw?.category || 'cr',
      tags: Array.isArray(raw?.tags) && raw.tags.length
        ? raw.tags
        : [raw?.language, raw?.level, raw?.category].filter(Boolean),
      faculty: { ...(facultyDoc || {}), name: facultyName, rating: Number(facultyDoc?.rating) || 4.8, students: Number(facultyDoc?.students) || 0, subject: facultyDoc?.subject || '' },
      language: raw?.language || 'English',
      level: raw?.level || 'Beginner',
      price,
      originalPrice: orig,
      rating: Number(raw?.rating) || (Number(facultyDoc?.rating) || 4.8),
      reviewCount: Number(raw?.reviewCount ?? raw?.review_count) || 0,
      students: Number(raw?.students) || 0,
      isBestseller: !!raw?.isBestseller,
      modules: raw?.modules || [],
      chapters: raw?.chapters || [],
      highlights: Array.isArray(raw?.highlights) && raw.highlights.length
        ? raw.highlights
        : (raw?.description ? [String(raw.description).split('.').filter(Boolean)[0] + '.'] : ['Self-paced learning at your own pace']),
      description: raw?.description || raw?.subtitle || `Comprehensive ${raw?.category || ''} course.`,
    } as Course;
  };

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [c, f, e] = await Promise.all([
        api.listCoursesPublic(),
        api.listFacultiesPublic().catch(() => ({ faculties: [] })),
        api.listExpertsPublic().catch(() => ({ experts: [] })),
      ]);
      const facList: Faculty[] = f.faculties || [];
      setFaculties(facList);
      setExperts(e.experts || []);
      setCourses((c.courses || []).map((row: any) => normalizeCourse(row, facList)));
    } catch (err: any) {
      setError(err?.message || 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const getCourse = useCallback((id: string) => courses.find((c) => c.id === id), [courses]);

  return (
    <Ctx.Provider value={{ courses, faculties, experts, loading, error, refresh, getCourse }}>
      {children}
    </Ctx.Provider>
  );
};

export function useCourses(): CoursesCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCourses must be used within CoursesProvider');
  return c;
}

// Convenience: returns just the array (most call sites used `COURSES.find/filter`)
export function useCourseList(): Course[] { return useCourses().courses; }
