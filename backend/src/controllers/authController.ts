import crypto from "crypto";
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { User } from "../models/User";
import { signToken, toPublicUser } from "../utils/jwt";
import { AuthRequest } from "../middleware/auth";
import {
  isValidEmail,
  requireString,
  ValidationError,
} from "../utils/validation";

/** Demo / bootstrap: set ADMIN_SIGNUP_SECRET in .env (8+ chars) and send same value as adminSignupSecret */
function adminSignupSecretValid(provided: string): boolean {
  const expected = process.env.ADMIN_SIGNUP_SECRET?.trim() ?? "";
  if (expected.length < 8) return false;
  if (provided.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(provided, "utf8"),
      Buffer.from(expected, "utf8")
    );
  } catch {
    return false;
  }
}

export async function signup(req: Request, res: Response): Promise<void> {
  try {
    const name = requireString(req.body?.name, "name");
    const email = requireString(req.body?.email, "email");
    const password = requireString(req.body?.password, "password");

    if (!isValidEmail(email)) {
      throw new ValidationError("Invalid email format");
    }
    if (password.length < 6) {
      throw new ValidationError("Password must be at least 6 characters");
    }

    const portalRaw = req.body?.portal;
    const adminSecretRaw = req.body?.adminSignupSecret;
    const adminSecret =
      typeof adminSecretRaw === "string" ? adminSecretRaw : "";
    const isAdminSignup = adminSignupSecretValid(adminSecret);

    if (
      typeof portalRaw === "string" &&
      portalRaw.toLowerCase() === "admin" &&
      !isAdminSignup
    ) {
      res.status(403).json({
        message:
          "Admin signup requires a valid adminSignupSecret when ADMIN_SIGNUP_SECRET is configured.",
      });
      return;
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409).json({ message: "Email already registered" });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    const role = isAdminSignup ? "ADMIN" : "MEMBER";
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashed,
      role,
    });

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      token,
      user: toPublicUser(user),
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(err.statusCode).json({ message: err.message });
      return;
    }
    res.status(500).json({ message: "Server error" });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const email = requireString(req.body?.email, "email");
    const password = requireString(req.body?.password, "password");

    if (!isValidEmail(email)) {
      throw new ValidationError("Invalid email format");
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const portalRaw = req.body?.portal;
    const portal =
      typeof portalRaw === "string" ? portalRaw.toLowerCase().trim() : "";
    if (portal === "admin" && user.role !== "ADMIN") {
      res.status(403).json({
        message:
          "This account is not an administrator. Use the member sign-in page.",
      });
      return;
    }
    if (portal === "member" && user.role !== "MEMBER") {
      res.status(403).json({
        message:
          "Administrator accounts must use the admin sign-in page.",
      });
      return;
    }

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    res.json({
      token,
      user: toPublicUser(user),
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(err.statusCode).json({ message: err.message });
      return;
    }
    res.status(500).json({ message: "Server error" });
  }
}

/** Current profile — role comes from DB so UI stays accurate after admin promotions */
export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.user!.id).select("name email role");
    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }
    res.json({ user: toPublicUser(user) });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
}
