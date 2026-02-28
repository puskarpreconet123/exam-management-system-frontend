import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import StudentDashboard from './components/StudentDashboard';
import ActiveExamInterface from './components/ActiveExamInterface';
import Login from './components/Login';
import { ThemeProvider, ThemeToggle } from './components/ThemeContext';
import { AuthProvider, useAuth } from './components/AuthContext';
import MyResults from './pages/MyResults';
import Settings from './pages/Settings';
import StudentLayout from './pages/StudentLayout'; // Ensure this path is correct

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
      <AuthProvider>
        <BrowserRouter>
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
        </BrowserRouter>
        <ThemeToggle />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;