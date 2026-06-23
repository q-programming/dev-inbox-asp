import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AuthGuard from '@app/guard/AuthGuard';
import { AppRoute } from '@app/routes';

const LandingPage = lazy(() => import('@app/pages/LandingPage'));
const LoginPage = lazy(() => import('@app/auth/LoginPage'));
const RegisterPage = lazy(() => import('@app/auth/RegisterPage'));
const AppLayout = lazy(() => import('@app/layout/Layout'));
const InboxPage = lazy(() => import('@feature/inbox/InboxPage'));
const SettingsPage = lazy(() => import('@feature/settings/SettingsPage'));
const NotesPage = lazy(() => import('@feature/notes/NotesPage'));

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-gray-400 text-sm animate-pulse">Loading…</div>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Spinner />}>
        <Routes>
          {/* Public */}
          <Route path={AppRoute.HOME} element={<LandingPage />} />
          <Route path={AppRoute.LOGIN} element={<LoginPage />} />
          <Route path={AppRoute.REGISTER} element={<RegisterPage />} />

          {/* Protected — AuthGuard verifies session, AppLayout provides shell */}
          <Route element={<AuthGuard />}>
            <Route element={<AppLayout />}>
              <Route path={AppRoute.INBOX} element={<InboxPage />} />
              <Route path={AppRoute.SETTINGS} element={<SettingsPage />} />
              <Route path={AppRoute.NOTES} element={<NotesPage />} />
              <Route path="*" element={<Navigate to={AppRoute.INBOX} replace />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
