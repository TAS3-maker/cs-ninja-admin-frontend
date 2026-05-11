import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, tokens } from '../services/api';

interface User {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  xp: number;
  streak?: number;
  enrolledCourses: string[];
  badges?: string[];
  level?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  pendingOTP: null;
  login: (identifier: string, password: string) => Promise<void>;
  signup: (name: string, email: string, phone: string, password: string) => Promise<void>;
  verifyOTP: (otp: string) => Promise<void>;
  forgotPassword: (identifier: string) => Promise<void>;
  resetPassword: (otp: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  updateXP: (points: number) => void;
  enrollCourse: (courseId: string) => void;
  updateUser: (patch: Partial<User>) => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { void loadSession(); }, []);

  const loadSession = async () => {
    try {
      const access = await tokens.getAccess();
      if (access) {
        const res = await api.me();
        if (res?.user) setUser(res.user);
      }
    } catch { await tokens.clear(); }
    setIsLoading(false);
  };

  const login = async (identifier: string, password: string) => {
    const res = await api.login(identifier, password);
    await tokens.set(res.accessToken, res.refreshToken);
    setUser(res.user);
    await AsyncStorage.setItem('csninja_user', JSON.stringify(res.user));
  };

  const signup = async (name: string, email: string, phone: string, password: string) => {
    const payload: any = { name, password };
    if (email) payload.email = email;
    if (phone) payload.phone = phone;
    const res = await api.signup(payload);
    await tokens.set(res.accessToken, res.refreshToken);
    setUser(res.user);
    await AsyncStorage.setItem('csninja_user', JSON.stringify(res.user));
  };

  // OTP flow is now a no-op (direct signup); kept for backwards compat
  const verifyOTP = async (_otp: string) => { /* no-op */ };
  const forgotPassword = async (_identifier: string) => {
    throw new Error('Password reset is not yet implemented on the backend.');
  };
  const resetPassword = async (_otp: string, _newPassword: string) => {
    throw new Error('Password reset is not yet implemented on the backend.');
  };

  const logout = async () => {
    await tokens.clear();
    await AsyncStorage.removeItem('csninja_user');
    setUser(null);
  };

  const updateXP = (points: number) => {
    if (!user) return;
    const next = { ...user, xp: (user.xp || 0) + points };
    setUser(next);
    AsyncStorage.setItem('csninja_user', JSON.stringify(next));
  };

  const enrollCourse = (courseId: string) => {
    if (!user) return;
    if (user.enrolledCourses.includes(courseId)) return;
    const next = { ...user, enrolledCourses: [...user.enrolledCourses, courseId] };
    setUser(next);
    AsyncStorage.setItem('csninja_user', JSON.stringify(next));
  };

  const updateUser = (patch: Partial<User>) => {
    if (!user) return;
    const next = { ...user, ...patch };
    setUser(next);
    AsyncStorage.setItem('csninja_user', JSON.stringify(next));
    api.patch('/auth/me', patch).catch(() => {/* best-effort */});
  };

  const refresh = async () => {
    try {
      const res = await api.me();
      if (res?.user) setUser(res.user);
    } catch {/* best-effort */}
  };

  return (
    <AuthContext.Provider value={{
      user, isLoading, isAuthenticated: !!user, pendingOTP: null,
      login, signup, verifyOTP, forgotPassword, resetPassword,
      logout, updateXP, enrollCourse, updateUser, refresh,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
