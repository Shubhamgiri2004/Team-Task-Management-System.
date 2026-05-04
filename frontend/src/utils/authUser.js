/** Normalize API user payload (id vs _id) */
export function normalizeUser(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id =
    raw.id != null
      ? String(raw.id)
      : raw._id != null
        ? String(raw._id)
        : null;
  if (!id) return null;
  return {
    id,
    name: String(raw.name ?? ""),
    email: String(raw.email ?? ""),
    role: String(raw.role ?? "MEMBER").toUpperCase(),
  };
}

/** Fallback if login body omits user but returns a JWT */
export function userFromJwtToken(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(b64);
    const payload = JSON.parse(json);
    if (!payload.userId) return null;
    return {
      id: String(payload.userId),
      email: String(payload.email ?? ""),
      role: String(payload.role ?? "MEMBER").toUpperCase(),
      name: "",
    };
  } catch {
    return null;
  }
}

export function sessionFromAuthResponse(data) {
  const token = data?.token;
  if (!token || typeof token !== "string") {
    return { token: null, user: null };
  }
  let user = normalizeUser(data?.user);
  if (!user) user = userFromJwtToken(token);
  return { token, user };
}
