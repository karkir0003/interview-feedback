import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/common/Toast';
import { Navbar } from './components/layout/Navbar';
import { AnalyticsTracker } from './components/common/AnalyticsTracker';
import { StaffRoute, AuthenticatedRoute, GuestOnlyRoute } from './components/auth/Guards';

import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { PublicScorecardPage } from './pages/PublicScorecardPage';
import { CandidateHistoryPage } from './pages/CandidateHistoryPage';

export function App() {
  return (
    <BrowserRouter>
      <AnalyticsTracker />
      <AuthProvider>
        <ToastProvider>
          <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route
                  path="/login"
                  element={
                    <GuestOnlyRoute>
                      <LoginPage />
                    </GuestOnlyRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <StaffRoute>
                      <AdminDashboardPage />
                    </StaffRoute>
                  }
                />
                <Route
                  path="/history"
                  element={
                    <AuthenticatedRoute>
                      <CandidateHistoryPage />
                    </AuthenticatedRoute>
                  }
                />
                <Route path="/r/:token" element={<PublicScorecardPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
