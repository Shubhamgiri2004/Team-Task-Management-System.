import { Response } from "express";
import mongoose from "mongoose";
import { Project } from "../models/Project";
import { User } from "../models/User";
import { AuthRequest } from "../middleware/auth";
import { requireString, ValidationError } from "../utils/validation";

/**
 * Projects the user can act on: creator or listed in members.
 * Must match list/get/patch so the dashboard never shows projects you cannot update.
 */
function projectAccessFilter(userId: string) {
  if (!mongoose.isValidObjectId(userId)) {
    return { _id: null };
  }
  const oid = new mongoose.Types.ObjectId(userId);
  return {
    $or: [{ createdBy: oid }, { members: oid }],
  };
}

export async function createProject(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const name = requireString(req.body?.name, "name");
    const description =
      typeof req.body?.description === "string"
        ? req.body.description.trim()
        : "";

    const memberUsers = await User.find({ role: "MEMBER" }).select("_id").lean();
    const autoMemberIds = memberUsers.map((u) => u._id.toString());
    const uniqueMembers = Array.from(
      new Set([req.user!.id, ...autoMemberIds])
    );

    const project = await Project.create({
      name,
      description,
      createdBy: req.user!.id,
      members: uniqueMembers,
    });

    await project.populate("createdBy", "name email role");
    await project.populate("members", "name email role");

    res.status(201).json(project);
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(err.statusCode).json({ message: err.message });
      return;
    }
    res.status(500).json({ message: "Server error" });
  }
}

export async function listProjects(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const projects = await Project.find(projectAccessFilter(req.user!.id))
      .populate("createdBy", "name email role")
      .populate("members", "name email role")
      .sort({ updatedAt: -1 });

    res.json(projects);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
}

export async function addMember(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid project id" });
      return;
    }

    const emailRaw = req.body?.email;
    const email =
      typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";
    if (!email) {
      res.status(400).json({ message: "Member email is required" });
      return;
    }

    // Route is requireAdmin; admin must belong to the project (creator or member)
    const project = await Project.findOne({
      _id: id,
      ...projectAccessFilter(req.user!.id),
    });
    if (!project) {
      res.status(404).json({ message: "Project not found or no access" });
      return;
    }

    const memberUser = await User.findOne({ email });
    if (!memberUser) {
      res.status(404).json({ message: "User with this email not found" });
      return;
    }

    const memberId = memberUser._id.toString();
    const already = project.members.some((m) => m.toString() === memberId);
    if (already) {
      res.status(409).json({ message: "User is already a member" });
      return;
    }

    project.members.push(memberUser._id);
    await project.save();
    await project.populate("createdBy", "name email role");
    await project.populate("members", "name email role");

    res.json(project);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
}

export async function getProject(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid project id" });
      return;
    }

    const project = await Project.findOne({
      _id: id,
      ...projectAccessFilter(req.user!.id),
    })
      .populate("createdBy", "name email role")
      .populate("members", "name email role");

    if (!project) {
      res.status(404).json({ message: "Project not found or no access" });
      return;
    }

    res.json(project);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
}

export async function updateProjectStatus(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid project id" });
      return;
    }

    const statusRaw = req.body?.status;
    const status =
      typeof statusRaw === "string" ? statusRaw.trim().toUpperCase() : "";
    const allowed = ["IN_PROGRESS", "DONE", "OVERDUE"];
    if (!allowed.includes(status)) {
      res.status(400).json({
        message: "status must be one of: IN_PROGRESS, DONE, OVERDUE",
      });
      return;
    }

    const project = await Project.findOne({
      _id: id,
      ...projectAccessFilter(req.user!.id),
    });
    if (!project) {
      res.status(404).json({ message: "Project not found or no access" });
      return;
    }

    project.status = status as "IN_PROGRESS" | "DONE" | "OVERDUE";
    await project.save();
    await project.populate("createdBy", "name email role");
    await project.populate("members", "name email role");

    res.json(project);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
}
