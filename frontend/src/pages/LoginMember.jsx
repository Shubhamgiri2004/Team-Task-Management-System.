import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { authApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { sessionFromAuthResponse } from "../utils/authUser";

export default function LoginMember() {
  const { persistSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await authApi.login({
        email,
        password,
        portal: "member",
      });
      const { token, user } = sessionFromAuthResponse(data);
      if (!token || !user) {
        throw new Error("Invalid response from server");
      }
      persistSession(token, user);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral px-4">
      <div className="w-full max-w-md rounded-2xl border border-secondary/20 bg-white p-8 shadow-lg shadow-secondary/10">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-secondary">
          Member portal
        </p>
        <h1 className="mt-2 text-center text-2xl font-semibold text-text">
          Member sign in
        </h1>
        <p className="mt-2 text-center text-sm text-text/70">
          Sign in to see your tasks and projects.
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900 outline-none ring-brand/30 transition focus:ring-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900 outline-none ring-brand/30 transition focus:ring-2"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand px-4 py-3 font-medium text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          No account?{" "}
          <Link to="/signup" className="font-medium text-brand underline">
            Sign up (members)
          </Link>
        </p>
        <p className="mt-3 text-center text-sm text-gray-600">
          Admin?{" "}
          <Link to="/admin/login" className="font-medium text-brand underline">
            Admin sign in
          </Link>
        </p>
        <p className="mt-3 text-center text-sm">
          <Link to="/" className="text-gray-500 underline hover:text-gray-700">
            ← All sign-in options
          </Link>
        </p>
      </div>
    </div>
  );
}
