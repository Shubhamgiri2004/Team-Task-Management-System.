export function isAdminRole(user) {
  return String(user?.role ?? "").toUpperCase() === "ADMIN";
}
