import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { TOKEN_KEY, USER_KEY } from "../config/authStorage";
import { setAuthToken, authApi } from "../services/api";
import { normalizeUser } from "../utils/authUser";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;
      return normalizeUser(JSON.parse(raw));
    } catch {
      return null;
    }
  });

  useEffect(() => {
    setAuthToken(token || null);
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  /** Sync profile with server (DB role may differ from JWT) */
  useEffect(() => {
    if (!token) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const { data } = await authApi.me();
        const next = normalizeUser(data?.user);
        if (!cancelled && next) setUser(next);
      } catch {
        /* 401: interceptor clears session; other errors keep cached user */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    function onSessionExpired() {
      setToken(null);
      setUser(null);
      setAuthToken(null);
    }
    window.addEventListener("auth:session-expired", onSessionExpired);
    return () =>
      window.removeEventListener("auth:session-expired", onSessionExpired);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const persistSession = useCallback((newToken, newUser) => {
    const u = normalizeUser(newUser);
    if (!newToken || !u) {
      logout();
      return;
    }
    try {
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch {
      /* ignore */
    }
    setAuthToken(newToken);
    setToken(newToken);
    setUser(u);
  }, [logout]);

  const value = useMemo(
    () => ({
      token,
      user,
      /** Token is the source of truth for route guards (avoids Strict Mode / timing gaps) */
      isAuthenticated: Boolean(token),
      logout,
      persistSession,
    }),
    [token, user, logout, persistSession]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
