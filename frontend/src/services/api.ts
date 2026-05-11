import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
const API_BASE = `${BACKEND_URL}/api`;

const TOKEN_KEY = 'csninja_access_token';
const REFRESH_KEY = 'csninja_refresh_token';

export const tokens = {
  async getAccess(): Promise<string | null> { return AsyncStorage.getItem(TOKEN_KEY); },
  async getRefresh(): Promise<string | null> { return AsyncStorage.getItem(REFRESH_KEY); },
  async set(access: string, refresh?: string) {
    await AsyncStorage.setItem(TOKEN_KEY, access);
    if (refresh) await AsyncStorage.setItem(REFRESH_KEY, refresh);
  },
  async clear() {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY]);
  },
};

async function handle(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || body?.detail || `HTTP ${res.status}`);
  return body;
}

async function request(path: string, opts: RequestInit = {}): Promise<any> {
  const access = await tokens.getAccess();
  const isFormData = typeof FormData !== 'undefined' && opts.body instanceof FormData;
  const headers: any = { ...(opts.headers || {}) };
  // Don't override Content-Type when sending FormData — the runtime adds the
  // correct multipart boundary automatically. Forcing 'application/json' here
  // (the previous default) silently breaks RN/web file uploads.
  if (!isFormData && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  if (access) headers.Authorization = `Bearer ${access}`;
  let res = await fetch(`${API_BASE}${path}`, { ...opts, headers });

  // If 401, try refresh once
  if (res.status === 401 && path !== '/auth/refresh' && path !== '/auth/login' && path !== '/auth/signup') {
    const refresh = await tokens.getRefresh();
    if (refresh) {
      const rr = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (rr.ok) {
        const data = await rr.json();
        await tokens.set(data.accessToken);
        headers.Authorization = `Bearer ${data.accessToken}`;
        res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
      }
    }
  }
  return handle(res);
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body?: any) => request(path, { method: 'POST', body: JSON.stringify(body || {}) }),
  patch: (path: string, body?: any) => request(path, { method: 'PATCH', body: JSON.stringify(body || {}) }),
  del: (path: string) => request(path, { method: 'DELETE' }),

  // Auth
  signup: (data: { name: string; email?: string; phone?: string; password: string }) =>
    request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  login: (identifier: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }),
  me: () => request('/auth/me'),

  // Payments
  createOrder: (course_id: string, amount: number) =>
    request('/payments/create-order', { method: 'POST', body: JSON.stringify({ course_id, amount }) }),
  verifyPayment: (data: any) =>
    request('/payments/verify', { method: 'POST', body: JSON.stringify(data) }),

  // Uploads
  presignUpload: (filename: string, content_type = 'video/mp4', purpose: 'video' | 'image' | 'doubt' | 'avatar' | 'transcript' = 'video') =>
    request('/uploads/presign', { method: 'POST', body: JSON.stringify({ filename, content_type, purpose }) }),
  uploadToS3: async (upload_url: string, file: Blob | any, content_type = 'video/mp4') => {
    const res = await fetch(upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': content_type } });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return true;
  },
  // Direct backend upload — works on both native RN (multipart) and web preview
  // (browser CORS-free since we PUT to our own backend). Use this for any image
  // upload from the mobile app to avoid S3-CORS issues from the Expo web preview.
  uploadDirect: async (asset: { uri: string; mimeType?: string; fileName?: string }, purpose: 'video' | 'image' | 'doubt' | 'avatar' | 'transcript' = 'image') => {
    const fd = new FormData();
    const name = asset.fileName || `upload_${Date.now()}`;
    const type = asset.mimeType || 'image/jpeg';
    // React Native FormData accepts the {uri, type, name} shape directly.
    // On web (Expo Web), wrap in a real Blob.
    // @ts-ignore  - RN-specific FormData payload shape
    if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
      const blob = await (await fetch(asset.uri)).blob();
      fd.append('file', blob, name);
    } else {
      // @ts-ignore
      fd.append('file', { uri: asset.uri, type, name });
    }
    fd.append('purpose', purpose);
    return request('/uploads/direct', { method: 'POST', body: fd as any });
  },

  // Cart
  getCart: () => request('/cart'),
  addToCart: (course_id: string) =>
    request('/cart', { method: 'POST', body: JSON.stringify({ course_id }) }),
  removeFromCart: (course_id: string) =>
    request(`/cart/${course_id}`, { method: 'DELETE' }),
  clearCart: () => request('/cart', { method: 'DELETE' }),

  // Coupons
  validateCoupon: (code: string, course_id: string) =>
    request('/coupons/validate', { method: 'POST', body: JSON.stringify({ code, course_id }) }),

  // Doubts
  listDoubts: () => request('/doubts'),
  askDoubt: (data: { course_id: string; chapter_id?: string; topic?: string; question: string }) =>
    request('/doubts', { method: 'POST', body: JSON.stringify(data) }),
  replyDoubt: (id: string, body: { content?: string; image_url?: string } | string) => {
    // Accept either a plain string (legacy callers) or an object with content + optional image_url.
    const payload = typeof body === 'string' ? { content: body } : (body || {});
    return request(`/doubts/${id}/reply`, { method: 'POST', body: JSON.stringify(payload) });
  },

  // Progress (notes + step completion)
  getProgress: () => request('/progress'),
  saveNote: (data: { courseId: string; chapterId?: string; moduleId?: string; stepId: string; content: string; timestamp?: number; type?: string }) =>
    request('/progress/note', { method: 'POST', body: JSON.stringify(data) }),
  updateNote: (id: string, content: string) =>
    request(`/progress/note/${id}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
  deleteNote: (id: string) => request(`/progress/note/${id}`, { method: 'DELETE' }),
  completeStep: (data: { courseId: string; stepId: string }) =>
    request('/progress/complete-step', { method: 'POST', body: JSON.stringify({ course_id: data.courseId, step_id: data.stepId }) }),

  // Orders (Razorpay payment history)
  listOrders: () => request('/orders'),

  // Addresses
  listAddresses: () => request('/addresses'),
  addAddress: (data: any) => request('/addresses', { method: 'POST', body: JSON.stringify(data) }),
  updateAddress: (id: string, data: any) =>
    request(`/addresses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAddress: (id: string) => request(`/addresses/${id}`, { method: 'DELETE' }),

  // Transcripts
  getStepTranscript: (courseId: string, stepId: string) =>
    request(`/courses/${courseId}/steps/${stepId}/transcript`),

  // Notifications
  listNotifications: () => request('/notifications'),
  markNotificationsRead: (ids: string[]) =>
    request('/notifications/mark-read', { method: 'POST', body: JSON.stringify({ ids }) }),
  dismissNotification: (id: string) =>
    request('/notifications/dismiss', { method: 'POST', body: JSON.stringify({ id }) }),

  // Courses (public — no auth needed)
  listCourses: () => request('/courses'),
  listCoursesPublic: () => request('/courses'),
  getCoursePublic: (id: string) => request(`/courses/${id}`),
  listFacultiesPublic: () => request('/faculties'),
  listExpertsPublic: () => request('/experts'),

  // Videos
  listVideos: (params?: { course_id?: string; chapter_id?: string; mine?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.course_id) q.set('course_id', params.course_id);
    if (params?.mine) q.set('mine', 'true');
    const qs = q.toString();
    return request(`/videos${qs ? `?${qs}` : ''}`);
  },
  getVideo: (id: string) => request(`/videos/${id}`),
  saveVideo: (data: {
    title: string;
    description?: string;
    key: string;
    duration?: number;
    course_id?: string;
    chapter_id?: string;
    thumbnail_key?: string;
  }) => request('/videos', { method: 'POST', body: JSON.stringify(data) }),
};

export default api;
