/**
 * Role checks — always use DB-backed `req.user.role` from `authenticate` middleware.
 * Values are normalized to match the User model enum: ADMIN | MEMBER.
 */
export function isAdminRole(role: string | undefined): boolean {
  return String(role ?? "").toUpperCase() === "ADMIN";
}
