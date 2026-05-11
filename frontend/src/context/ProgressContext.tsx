/**
 * ProgressContext — backend-backed.
 * Loads completed steps + notes from /api/progress on login.
 * Notes & step completion are persisted via /api/progress/note + /api/progress/complete-step.
 * Bookmarks remain device-local (AsyncStorage) since the backend does not yet model them.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { useAuth } from './AuthContext';

interface Note {
  id: string;
  courseId: string;
  chapterId?: string;
  moduleId?: string;
  stepId: string;
  timestamp?: number;
  content: string;
  type: 'typed' | 'highlight';
  createdAt: string;
}

interface ProgressData {
  completedSteps: string[];
  notes: Note[];
  courseProgress: Record<string, number>;
  bookmarks: string[];
}

interface ProgressContextType {
  progress: ProgressData;
  loading: boolean;
  refresh: () => Promise<void>;
  completeStep: (stepId: string, courseId: string) => Promise<void>;
  isStepCompleted: (stepId: string) => boolean;
  addNote: (note: Omit<Note, 'id' | 'createdAt'>) => Promise<Note | null>;
  updateNote: (noteId: string, content: string) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  toggleBookmark: (stepId: string) => Promise<void>;
  isBookmarked: (stepId: string) => boolean;
  getCourseProgress: (courseId: string) => number;
}

const empty: ProgressData = { completedSteps: [], notes: [], courseProgress: {}, bookmarks: [] };
const ProgressContext = createContext<ProgressContextType | null>(null);

export const ProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<ProgressData>(empty);
  const [loading, setLoading]   = useState(false);

  // Bookmarks stay local (no backend yet)
  const loadBookmarks = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('csninja_bookmarks');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch { return []; }
  }, []);

  const saveBookmarks = useCallback(async (bm: string[]) => {
    try { await AsyncStorage.setItem('csninja_bookmarks', JSON.stringify(bm)); } catch {}
  }, []);

  const refresh = useCallback(async () => {
    if (!user) { setProgress(empty); return; }
    setLoading(true);
    try {
      const [data, bookmarks] = await Promise.all([api.getProgress(), loadBookmarks()]);
      setProgress({
        completedSteps: data?.completedSteps || [],
        notes: data?.notes || [],
        courseProgress: data?.courseProgress || {},
        bookmarks,
      });
    } catch {
      // offline fallback — keep whatever we have
    } finally {
      setLoading(false);
    }
  }, [user, loadBookmarks]);

  useEffect(() => { refresh(); }, [refresh]);

  const completeStep = useCallback(async (stepId: string, courseId: string) => {
    if (progress.completedSteps.includes(stepId)) return;
    // Optimistic update
    setProgress((p) => ({
      ...p,
      completedSteps: [...p.completedSteps, stepId],
      courseProgress: { ...p.courseProgress, [courseId]: Math.min(100, (p.courseProgress[courseId] || 0) + 5) },
    }));
    try { await api.completeStep({ courseId, stepId }); } catch {}
  }, [progress.completedSteps]);

  const addNote = useCallback(async (note: Omit<Note, 'id' | 'createdAt'>) => {
    try {
      const saved = await api.saveNote({
        courseId: note.courseId,
        chapterId: (note as any).chapterId,
        moduleId: (note as any).moduleId,
        stepId: note.stepId,
        content: note.content,
        timestamp: note.timestamp,
        type: note.type,
      });
      setProgress((p) => ({ ...p, notes: [...p.notes, saved as Note] }));
      return saved as Note;
    } catch {
      return null;
    }
  }, []);

  const updateNote = useCallback(async (noteId: string, content: string) => {
    // optimistic
    setProgress((p) => ({ ...p, notes: p.notes.map((n) => n.id === noteId ? { ...n, content } : n) }));
    try { await api.updateNote(noteId, content); } catch {}
  }, []);

  const deleteNote = useCallback(async (noteId: string) => {
    setProgress((p) => ({ ...p, notes: p.notes.filter((n) => n.id !== noteId) }));
    try { await api.deleteNote(noteId); } catch {}
  }, []);

  const toggleBookmark = useCallback(async (stepId: string) => {
    setProgress((p) => {
      const bm = p.bookmarks.includes(stepId)
        ? p.bookmarks.filter((b) => b !== stepId)
        : [...p.bookmarks, stepId];
      saveBookmarks(bm);
      return { ...p, bookmarks: bm };
    });
  }, [saveBookmarks]);

  const isStepCompleted = (stepId: string) => progress.completedSteps.includes(stepId);
  const isBookmarked    = (stepId: string) => progress.bookmarks.includes(stepId);
  const getCourseProgress = (courseId: string) => progress.courseProgress[courseId] || 0;

  return (
    <ProgressContext.Provider value={{
      progress, loading, refresh,
      completeStep, isStepCompleted,
      addNote, updateNote, deleteNote,
      toggleBookmark, isBookmarked,
      getCourseProgress,
    }}>
      {children}
    </ProgressContext.Provider>
  );
};

export const useProgress = () => {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be inside ProgressProvider');
  return ctx;
};
