import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import StudentDashboard from './pages/StudentDashboard';
import ActiveExamInterface from './components/ActiveExamInterface';
import Login from './pages/Auth/Login';
import { ThemeProvider, ThemeToggle } from './components/ThemeContext';
import { AuthProvider, useAuth } from './components/AuthContext';
import MyResults from './pages/MyResults';
import Settings from './pages/Settings';
import StudentLayout from './layouts/StudentLayout'; // Ensure this path is correct
import {ToastProvider} from "./context/ToastContext"

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

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="animate-spin rounded-full size-12 border-b-2 border-primary"></div>
    </div>
  );
  
  if (!user) return <Navigate to="/login" replace />;

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

            {/* Dashboard Portal Routes (With Shared Sidebar/Header) */}
            <Route element={
              <ProtectedRoute>
                <StudentLayout />
              </ProtectedRoute>
            }>
              <Route path="/dashboard" element={<StudentDashboard />} />
              <Route path="/results" element={<MyResults />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Route>

            {/* Clean Interface Route (No Sidebar) */}
            <Route path="/exam/:attemptId" element={
              <ProtectedRoute>
                <ActiveExamInterface />
              </ProtectedRoute>
            } />
            
            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
      </AuthProvider>
      </ToastProvider>
        </BrowserRouter>
        <ThemeToggle />
    </ThemeProvider>
  );
}

export default App;