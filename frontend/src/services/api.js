import axios from "axios";
import { TOKEN_KEY, USER_KEY } from "../config/authStorage";

const baseURL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

function requestPath(config) {
  if (!config) return "";
  const u = String(config.url || "");
  if (u.startsWith("http")) {
    try {
      return new URL(u).pathname;
    } catch {
      return u;
    }
  }
  return u;
}

/** Attach saved JWT before React runs so the first protected request is authorized */
function hydrateAuthHeader() {
  try {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) {
      api.defaults.headers.common.Authorization = `Bearer ${t}`;
    }
  } catch {
    /* ignore */
  }
}

hydrateAuthHeader();

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

function clearStoredSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}

/** Only these paths return 401 for "invalid credentials", not "bad session" */
const AUTH_WHITELIST_401 = ["/auth/login", "/auth/signup"];

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const path = requestPath(err.config);
    const isAuthPublic = AUTH_WHITELIST_401.some((p) => path.includes(p));

    if (status === 401 && !isAuthPublic) {
      delete api.defaults.headers.common.Authorization;
      clearStoredSession();
      window.dispatchEvent(new CustomEvent("auth:session-expired"));
    }

    const msg =
      err.response?.data?.message ||
      err.message ||
      "Something went wrong. Please try again.";
    return Promise.reject(new Error(msg));
  }
);

export const authApi = {
  signup: (data) => api.post("/auth/signup", data),
  login: (data) => api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
};

export const projectsApi = {
  list: () => api.get("/projects"),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post("/projects", data),
  updateStatus: (projectId, status) =>
    api.patch(`/projects/${projectId}/status`, { status }),
  addMember: (projectId, email) =>
    api.post(`/projects/${projectId}/add-member`, { email }),
};

export const tasksApi = {
  list: (params) => api.get("/tasks", { params }),
  create: (data) => api.post("/tasks", data),
  update: (id, data) => api.patch(`/tasks/${id}`, data),
};
