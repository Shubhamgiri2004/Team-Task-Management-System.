import { Link, useLocation } from "react-router-dom";

/** Entry point: separate portals for administrators vs team members */
export default function PortalHome() {
  const location = useLocation();
  const from = location.state?.from;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral px-4 py-12">
      {from?.pathname && (
        <p className="mb-6 rounded-lg bg-brand-light px-4 py-2 text-center text-sm text-brand">
          Sign in to continue to{" "}
          <span className="font-medium">{from.pathname}</span>
        </p>
      )}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-semibold text-text">Team Task Manager</h1>
        <p className="mt-2 text-text/70">
          Choose how you sign in — admin and member use different sign-in pages.
        </p>
      </div>

      <div className="grid w-full max-w-lg gap-4 sm:grid-cols-2 sm:max-w-2xl">
        <Link
          to="/admin/login"
          state={from ? { from } : undefined}
          className="rounded-2xl border-2 border-brand/20 bg-gradient-to-br from-brand-light to-white p-6 shadow-sm transition hover:border-brand hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            Administrators
          </p>
          <h2 className="mt-2 text-lg font-semibold text-text">Admin sign in</h2>
          <p className="mt-2 text-sm text-text/70">
            Create projects, manage members, and assign tasks.
          </p>
          <span className="mt-4 inline-block text-sm font-medium text-brand underline">
            Continue →
          </span>
        </Link>

        <Link
          to="/member/login"
          state={from ? { from } : undefined}
          className="rounded-2xl border border-secondary/30 bg-white p-6 shadow-sm transition hover:border-secondary hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
            Team members
          </p>
          <h2 className="mt-2 text-lg font-semibold text-text">Member sign in</h2>
          <p className="mt-2 text-sm text-text/70">
            View your projects and update tasks assigned to you.
          </p>
          <span className="mt-4 inline-block text-sm font-medium text-brand underline">
            Continue →
          </span>
        </Link>
      </div>

      <p className="mt-10 text-center text-xs text-text/70">
        New to the team? Members can{" "}
        <Link to="/signup" className="font-medium text-brand underline">
          create an account
        </Link>
        . Admin accounts are issued by your organization.
      </p>
    </div>
  );
}
