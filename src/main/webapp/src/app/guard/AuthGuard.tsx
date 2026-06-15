import useAuthStore, { AuthStatus } from '@/shared/store/auth.store.ts';
import { useAuthBootstrap } from '@/shared/hooks/useAuthQuery.ts';
import { Navigate, Outlet } from 'react-router-dom';
import { AppRoute } from '@/app/routes';

/**
 * Route-level guard — used as a React Router route element wrapping protected routes.
 * On every mount:
 * 1. Fires POST /me in the background to verify the JWT cookie.
 * 2. If localStorage has a profile (returning user) → renders children immediately for
 *    a fast "Hello John" experience while verification is in flight.
 * 3. If nothing is in localStorage (first visit / OAuth callback) → shows a spinner.
 * 4. Once /me resolves: authenticated → keep rendering; unauthenticated → redirect to /login.
 */
const AuthGuard = () => {
  const { status, profile } = useAuthStore();
  useAuthBootstrap();

  if (status === AuthStatus.LOADING && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 text-sm animate-pulse">Loading…</div>
      </div>
    );
  }

  if (status === AuthStatus.UNAUTHENTICATED) {
    return <Navigate to={AppRoute.LOGIN} replace />;
  }

  return <Outlet />;
};

export default AuthGuard;
