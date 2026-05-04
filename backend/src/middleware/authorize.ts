import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { isAdminRole } from "../utils/rbac";

/** Only users with role ADMIN (from database) may proceed */
export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  if (!isAdminRole(req.user.role)) {
    res.status(403).json({ message: "Admin access required" });
    return;
  }
  next();
}
