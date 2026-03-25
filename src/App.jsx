import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import StudentDashboard from './pages/StudentDashboard';
import ActiveExamInterface from './components/ActiveExamInterface';
import Login from './pages/Auth/Login';
import { ThemeProvider, ThemeToggle } from './components/ThemeContext';
import { AuthProvider, useAuth } from './components/AuthContext';
import MyResults from './pages/MyResults';
import ResultDetails from './pages/ResultDetails';
import Settings from './pages/Settings';
import StudentLayout from './layouts/StudentLayout';
import AdminLayout from './layouts/AdminLayout';
import { ToastProvider } from "./context/ToastContext";

import AdminDashboard from './pages/Admin/AdminDashboard';
import ExamsPage from './pages/Admin/ExamsPage';
import QuestionsPage from './pages/Admin/QuestionsPage';
import MonitoringPage from './pages/Admin/MonitoringPage';
import EvaluationPage from './pages/Admin/EvaluationPage';
import AdminSettings from './pages/Admin/AdminSettings';

import { useEffect } from "react";
import { useToast } from "./context/ToastContext";
import { setLogoutHandler, setToastHandler } from "./utils/api";

const InterceptorConnector = () => {
  const { showToast } = useToast();
  const { logout } = useAuth();

  useEffect(() => {
    setToastHandler(showToast);
    setLogoutHandler(logout);
  }, [showToast, logout]);

  return null;
};

const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-[#0f172a]">
      <div className="animate-spin rounded-full size-12 border-b-2 border-primary"></div>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <InterceptorConnector />
            <Routes>
              {/* Public Route */}
              <Route path="/login" element={<Login />} />

              {/* Admin Portal Routes */}
              <Route element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/exams" element={<ExamsPage />} />
                <Route path="/admin/questions" element={<QuestionsPage />} />
                <Route path="/admin/monitoring" element={<MonitoringPage />} />
                <Route path="/admin/evaluation" element={<EvaluationPage />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              </Route>

              {/* Student Portal Routes */}
              <Route element={
                <ProtectedRoute roles={["student"]}>
                  <StudentLayout />
                </ProtectedRoute>
              }>
                <Route path="/dashboard" element={<StudentDashboard />} />
                <Route path="/results" element={<MyResults />} />
                <Route path="/results/:attemptId" element={<ResultDetails />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Route>

              {/* Clean Interface Route (No Sidebar) */}
              <Route path="/exam/:attemptId" element={
                <ProtectedRoute>
                  <ActiveExamInterface />
                </ProtectedRoute>
              } />

              {/* Default Login Redirect */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
      <ThemeToggle />
    </ThemeProvider>
  );
}

export default App;