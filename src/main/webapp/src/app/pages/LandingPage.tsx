import { Link, Navigate } from 'react-router-dom';
import useAuthStore, { AuthStatus } from '@/shared/store/auth.store.ts';
import { useMeQuery } from '@/shared/hooks/useAuthQuery.ts';
import { AppRoute } from '@/app/routes';

/**
 * Public landing page. Also acts as the OAuth callback landing point — calls /me
 * in the background so GitHub OAuth users are redirected to /inbox automatically.
 */
const LandingPage = () => {
  const { status, profile } = useAuthStore();
  const { data: me, isSuccess } = useMeQuery();

  if (profile && status !== AuthStatus.UNAUTHENTICATED) {
    return <Navigate to={AppRoute.INBOX} replace />;
  }

  if (isSuccess && me) {
    return <Navigate to={AppRoute.INBOX} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex justify-between items-center px-6 py-3 border-b bg-white">
        <span className="font-bold text-lg">Dev Inbox</span>
        <div className="flex gap-3">
          <Link
            to={AppRoute.LOGIN}
            className="text-sm px-4 py-2 rounded border border-gray-300 hover:bg-gray-50"
          >
            Sign in
          </Link>
          <Link
            to={AppRoute.REGISTER}
            className="text-sm px-4 py-2 rounded bg-gray-900 text-white hover:bg-gray-700"
          >
            Sign up
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
        <h1 className="text-4xl font-bold">Your developer workflow, unified.</h1>
        <p className="text-gray-500 max-w-md">
          Dev Inbox aggregates GitHub PRs, Azure DevOps work items, and personal notes into one
          filterable inbox.
        </p>
        <Link
          to={AppRoute.REGISTER}
          className="mt-4 px-6 py-3 rounded bg-gray-900 text-white hover:bg-gray-700"
        >
          Get started
        </Link>
      </main>
    </div>
  );
};

export default LandingPage;
