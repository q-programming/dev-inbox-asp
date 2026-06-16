import { NavLink, Outlet } from 'react-router-dom';
import useAuthStore from '@shared/store/auth.store.ts';
import { useLogoutMutation } from '@shared/hooks/useAuthQuery.ts';
import { NAV_ITEMS } from '@app/routes';

const AppLayout = () => {
  const { profile, identity } = useAuthStore();
  const logoutMutation = useLogoutMutation();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-3 border-b bg-white">
        <span className="font-bold text-lg">Dev Inbox</span>
        {profile && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {profile.firstName} {profile.lastName}
              {identity?.email && <span className="ml-1 text-gray-400">({identity.email})</span>}
            </span>
            <button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="text-sm text-gray-500 hover:text-gray-800 disabled:opacity-50"
            >
              Sign out
            </button>
          </div>
        )}
      </header>

      <div className="flex flex-1">
        {/* Sidemenu */}
        <nav className="w-48 border-r bg-gray-50 p-4 flex flex-col gap-1">
          {NAV_ITEMS.map(({ path, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `px-3 py-2 rounded text-sm ${isActive ? 'bg-gray-200 font-medium' : 'text-gray-700 hover:bg-gray-100'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Page content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
