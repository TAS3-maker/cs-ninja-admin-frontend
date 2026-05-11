import axios, { AxiosInstance } from 'axios';

// const http: AxiosInstance = axios.create({ baseURL: '/api', timeout: 30_000 });
const http: AxiosInstance = axios.create({
  baseURL: 'https://csninja-backend.onrender.com/api',
  // timeout: 30_000,
});

http.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('admin_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

http.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      if (location.pathname !== '/login') location.href = '/api/admin-ui/login';
    }
    return Promise.reject(err);
  },
);

export const api = {
  // auth
  login: (identifier: string, password: string) =>
    http.post('/auth/login', { identifier, password }).then((r) => r.data),
  me: () => http.get('/auth/me').then((r) => r.data),

  // admin
  listUsers: (role?: string) => http.get('/admin/users', { params: role ? { role } : {} }).then((r) => r.data.users),
  createUser: (body: any) => http.post('/admin/users', body).then((r) => r.data),
  updateUser: (id: string, body: any) => http.patch(`/admin/users/${id}`, body).then((r) => r.data),
  deleteUser: (id: string) => http.delete(`/admin/users/${id}`).then((r) => r.data),

  listCourses: () => http.get('/admin/courses').then((r) => r.data.courses),
  createCourse: (body: any) => http.post('/admin/courses', body).then((r) => r.data),
  updateCourse: (id: string, body: any) => http.patch(`/admin/courses/${id}`, body).then((r) => r.data),
  deleteCourse: (id: string) => http.delete(`/admin/courses/${id}`).then((r) => r.data),
  reorderCourses: (ids: string[]) => http.post('/admin/courses/reorder', { ids }).then((r) => r.data),

  addChapter: (cid: string, body: any) => http.post(`/admin/courses/${cid}/chapters`, body).then((r) => r.data),
  updateChapter: (cid: string, chid: string, body: any) => http.patch(`/admin/courses/${cid}/chapters/${chid}`, body).then((r) => r.data),
  deleteChapter: (cid: string, chid: string) => http.delete(`/admin/courses/${cid}/chapters/${chid}`).then((r) => r.data),
  reorderChapters: (cid: string, ids: string[]) => http.post(`/admin/courses/${cid}/chapters/reorder`, { ids }).then((r) => r.data),

  addModule: (cid: string, chid: string, body: any) => http.post(`/admin/courses/${cid}/chapters/${chid}/modules`, body).then((r) => r.data),
  updateModule: (cid: string, chid: string, mid: string, body: any) => http.patch(`/admin/courses/${cid}/chapters/${chid}/modules/${mid}`, body).then((r) => r.data),
  deleteModule: (cid: string, chid: string, mid: string) => http.delete(`/admin/courses/${cid}/chapters/${chid}/modules/${mid}`).then((r) => r.data),
  reorderModules: (cid: string, chid: string, ids: string[]) => http.post(`/admin/courses/${cid}/chapters/${chid}/modules/reorder`, { ids }).then((r) => r.data),

  listFaculties: () => http.get('/admin/faculties').then((r) => r.data.faculties),
  createFaculty: (body: any) => http.post('/admin/faculties', body).then((r) => r.data),
  updateFaculty: (id: string, body: any) => http.patch(`/admin/faculties/${id}`, body).then((r) => r.data),
  deleteFaculty: (id: string) => http.delete(`/admin/faculties/${id}`).then((r) => r.data),

  listExperts: () => http.get('/admin/experts').then((r) => r.data.experts),
  createExpert: (body: any) => http.post('/admin/experts', body).then((r) => r.data),
  updateExpert: (id: string, body: any) => http.patch(`/admin/experts/${id}`, body).then((r) => r.data),
  deleteExpert: (id: string) => http.delete(`/admin/experts/${id}`).then((r) => r.data),

  analyticsSummary: () => http.get('/admin/analytics/summary').then((r) => r.data),
  analyticsRevenue: (days = 30) => http.get('/admin/analytics/revenue', { params: { days } }).then((r) => r.data),
  analyticsTopCourses: () => http.get('/admin/analytics/top-courses').then((r) => r.data),

  // S3 upload helpers (used for video, image, doubt attachments, etc.)
  presign: (filename: string, content_type: string, purpose: 'video' | 'image' | 'doubt' | 'avatar' | 'transcript' = 'image') =>
    http.post('/uploads/presign', { filename, content_type, purpose }).then((r) => r.data as { upload_url: string; key: string; public_url: string }),

  // Doubts (admin acts on /api/doubts not /api/admin/...)
  listDoubts: () => http.get('/doubts').then((r) => r.data.doubts as any[]),
  replyDoubt: (id: string, body: { content?: string; image_url?: string }) =>
    http.post(`/doubts/${id}/reply`, body).then((r) => r.data),

  // File upload helper — uses backend S3 proxy (server-side PutObject) so the
  // admin web UI doesn't have to deal with browser CORS preflight against S3.
  // Returns a CloudFront-served public URL.
  uploadFile: async (file: File, purpose: 'video' | 'image' | 'doubt' | 'avatar' | 'transcript' = 'image') => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('purpose', purpose);
    const r = await http.post('/uploads/direct', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300_000,
    });
    return (r.data?.public_url as string) || '';
  },
};

export function getStoredUser(): any | null {
  try { return JSON.parse(localStorage.getItem('admin_user') || 'null'); } catch { return null; }
}
export function setSession(token: string, user: any) {
  localStorage.setItem('admin_token', token);
  localStorage.setItem('admin_user', JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
}
