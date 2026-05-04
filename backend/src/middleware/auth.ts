import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { User } from "../models/User";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    const token = header.slice(7);
    const payload = verifyToken(token);
    const user = await User.findById(payload.userId).select("_id email role");
    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }
    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}
