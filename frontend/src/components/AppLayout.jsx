import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isAdminRole } from "../utils/roles";

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-neutral">
      <header className="border-b border-brand/15 bg-gradient-to-r from-brand to-secondary text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link
            to="/dashboard"
            className="rounded-lg bg-white/15 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-white/25"
          >
            Team Tasks
          </Link>
          <nav className="flex items-center gap-3 text-sm text-white/90">
            <Link
              to="/tasks"
              className="hidden rounded-lg px-2 py-1 hover:bg-white/15 sm:inline"
            >
              Tasks
            </Link>
            <span className="hidden sm:inline">{user?.name}</span>
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium uppercase text-text">
              {isAdminRole(user) ? "Admin" : "Member"}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-white/30 px-3 py-1.5 text-white transition hover:bg-white/15"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
