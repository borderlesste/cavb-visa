
import { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AppProvider } from './context/AppContext';
import { APP_ROUTES } from './constants';
import Header from './components/Header';
import NotificationHost from './components/NotificationHost';
import { LoadingSpinner } from './components/LoadingSpinner';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
// IMPORTANT: load the real email verification page (not the temporary test page)
const EmailVerificationPage = lazy(() => import('./pages/EmailVerificationPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <AppProvider>
          <HashRouter>
            <NotificationHost />
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner size="lg" className="text-center" />
              </div>
            }>
              <Routes>
                <Route path="/verify-email/:token" element={<EmailVerificationPage />} />
                <Route path="*" element={
                  <div className="flex flex-col min-h-screen">
                    <Header />
                    <main className="flex-grow">
                      <Routes>
                          <Route path={APP_ROUTES.HOME} element={<HomePage />} />
                          <Route path={APP_ROUTES.AUTH} element={<AuthPage />} />
                          <Route path={APP_ROUTES.DASHBOARD} element={<DashboardPage />} />
                          <Route path={APP_ROUTES.ADMIN} element={<AdminDashboardPage />} />
                          <Route path={APP_ROUTES.PROFILE} element={<ProfilePage />} />
                          <Route path="*" element={<Navigate to={APP_ROUTES.HOME} replace />} />
                      </Routes>
                    </main>
                  </div>
                } />
              </Routes>
            </Suspense>
          </HashRouter>
      </AppProvider>
    </HelmetProvider>
  );
};

export default App;
