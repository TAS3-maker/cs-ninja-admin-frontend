/**
 * Course enrollment / validity helpers.
 *
 * The backend stores per-user enrollments at user.enrollments[] = [
 *   { course_id, enrolled_at, expires_at, validity_days }, ...
 * ].
 *
 * After validity_days have passed since enrollment, the course is considered
 * expired and the mobile app prompts the user to re-enroll (i.e. buy again).
 */

interface Enrollment {
  course_id: string;
  enrolled_at?: string;
  expires_at?: string;
  validity_days?: number;
}

interface AnyUser { enrollments?: Enrollment[]; enrolledCourses?: string[] }

export interface EnrollmentStatus {
  enrolled: boolean;       // course id present in enrolledCourses
  hasDates: boolean;       // backend has full enrollment record
  expired: boolean;        // expires_at is in the past
  daysLeft: number;        // negative when expired
  enrolledAt?: Date;
  expiresAt?: Date;
  validityDays?: number;
}

export const getEnrollmentStatus = (user: AnyUser | null | undefined, courseId: string): EnrollmentStatus => {
  const enrolled = !!(user?.enrolledCourses || []).includes(courseId);
  const rec = (user?.enrollments || []).find((e) => e.course_id === courseId);
  if (!rec || !rec.expires_at) {
    return { enrolled, hasDates: false, expired: false, daysLeft: 0 };
  }
  let expiresAt: Date | undefined;
  let enrolledAt: Date | undefined;
  try {
    expiresAt = new Date(rec.expires_at);
    if (rec.enrolled_at) enrolledAt = new Date(rec.enrolled_at);
  } catch {
    return { enrolled, hasDates: false, expired: false, daysLeft: 0 };
  }
  const now = new Date();
  const ms = expiresAt.getTime() - now.getTime();
  const daysLeft = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return {
    enrolled,
    hasDates: true,
    expired: ms < 0,
    daysLeft,
    enrolledAt,
    expiresAt,
    validityDays: rec.validity_days,
  };
};

export const formatDate = (d?: Date) =>
  d ? d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : '';
