import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Faculty from './pages/Faculty';
import Experts from './pages/Experts';
import Revenue from './pages/Revenue';
import Doubts from './pages/Doubts';
import Coupons from './pages/Coupons';
import Profile from './pages/Profile';
import { getStoredUser } from './api';

function Guard({ children, roles }: { children: JSX.Element; roles?: string[] }) {
  const u = getStoredUser();
  if (!u) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(u.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Guard><Layout /></Guard>}>
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Guard roles={['superadmin','teacher']}><Users /></Guard>} />
        <Route path="courses" element={<Guard roles={['superadmin','teacher','assistant']}><Courses /></Guard>} />
        <Route path="courses/:id" element={<Guard roles={['superadmin','teacher','assistant']}><CourseDetail /></Guard>} />
        <Route path="faculty" element={<Guard roles={['superadmin']}><Faculty /></Guard>} />
        <Route path="experts" element={<Guard roles={['superadmin']}><Experts /></Guard>} />
        <Route path="doubts" element={<Guard roles={['superadmin','teacher','assistant']}><Doubts /></Guard>} />
        <Route path="coupons" element={<Guard roles={['superadmin']}><Coupons /></Guard>} />
        <Route path="revenue" element={<Guard roles={['superadmin','accountant']}><Revenue /></Guard>} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
