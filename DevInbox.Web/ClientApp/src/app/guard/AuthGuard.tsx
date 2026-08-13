import useUserStore, { AuthStatus } from '@shared/store/user.store.ts';
import { useAuthBootstrap } from '@shared/hooks/useAuthQuery.ts';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AppRoute } from '@app/routes';

/**
 * Route-level guard — used as a React Router route element wrapping protected routes.
 * On every mount:
 * 1. Fires POST /me in the background to verify the JWT cookie.
 * 2. If localStorage has a profile (returning user) → renders children immediately for
 *    a fast "Hello John" experience while verification is in flight.
 * 3. If nothing is in localStorage (first visit / OAuth callback) → shows a spinner.
 * 4. Once /me resolves: authenticated → keep rendering; unauthenticated → redirect to /login.
 * 5. Once confirmed AUTHENTICATED with zero active integrations → redirect to /onboarding
 *    (unless already there) — first-time users must connect at least one integration before
 *    using the app. Skipped during the optimistic LOADING render since identity may not be
 *    fully hydrated yet.
 */
const AuthGuard = () => {
  const { status, firstName, lastName, identity } = useUserStore();
  const { pathname } = useLocation();
  useAuthBootstrap();

  if (status === AuthStatus.LOADING && !firstName && !lastName) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 text-sm animate-pulse">Loading…</div>
      </div>
    );
  }

  if (status === AuthStatus.UNAUTHENTICATED) {
    return <Navigate to={AppRoute.LOGIN} replace />;
  }

  if (status === AuthStatus.AUTHENTICATED) {
    const hasNoIntegrations = !identity?.integrations || identity.integrations.length === 0;
    if (hasNoIntegrations && pathname !== AppRoute.ONBOARDING) {
      return <Navigate to={AppRoute.ONBOARDING} replace />;
    }
  }

  return <Outlet />;
};

export default AuthGuard;

