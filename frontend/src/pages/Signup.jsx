import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { sessionFromAuthResponse } from "../utils/authUser";

export default function Signup() {
  const { persistSession } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminSignupSecret, setAdminSignupSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        name,
        email,
        password,
        portal: "member",
        ...(adminSignupSecret.trim()
          ? { adminSignupSecret: adminSignupSecret.trim() }
          : {}),
      };
      const { data } = await authApi.signup(payload);
      const { token, user } = sessionFromAuthResponse(data);
      if (!token || !user) {
        throw new Error("Invalid response from server");
      }
      persistSession(token, user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Signup failed");
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
          Create member account
        </h1>
        <p className="mt-2 text-center text-sm text-text/70">
          Members register below. To create an <strong>admin</strong> account
          locally, set <code className="text-xs">ADMIN_SIGNUP_SECRET</code> in{" "}
          <code className="text-xs">backend/.env</code> and enter the same value
          in the demo key field.
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-800 outline-none ring-brand/30 transition focus:ring-2"
            />
          </div>
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
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-800 outline-none ring-brand/30 transition focus:ring-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Password (min 6 characters)
            </label>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-800 outline-none ring-brand/30 transition focus:ring-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Demo admin key (optional)
            </label>
            <input
              type="password"
              autoComplete="off"
              placeholder="Must match ADMIN_SIGNUP_SECRET in backend .env"
              value={adminSignupSecret}
              onChange={(e) => setAdminSignupSecret(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-800 outline-none ring-brand/30 transition focus:ring-2"
            />
            <p className="mt-1 text-xs text-gray-500">
              Leave blank for a normal member account. Same value as in{" "}
              <code>backend/.env</code> → creates an admin.
            </p>
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
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/member/login" className="font-medium text-brand underline">
            Member sign in
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
