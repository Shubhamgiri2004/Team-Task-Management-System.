import { Response } from "express";
import mongoose from "mongoose";
import { Task } from "../models/Task";
import { Project } from "../models/Project";
import { AuthRequest } from "../middleware/auth";
import { requireString, ValidationError } from "../utils/validation";
import { isAdminRole } from "../utils/rbac";

const STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;

function memberProjectIdsFilter(userId: string) {
  return {
    $or: [
      { createdBy: new mongoose.Types.ObjectId(userId) },
      { members: new mongoose.Types.ObjectId(userId) },
    ],
  };
}

export async function createTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const title = requireString(req.body?.title, "title");
    const description =
      typeof req.body?.description === "string"
        ? req.body.description.trim()
        : "";
    const projectId = requireString(req.body?.projectId, "projectId");
    const assignedTo = requireString(req.body?.assignedTo, "assignedTo");
    const dueDateRaw = req.body?.dueDate;

    if (!mongoose.isValidObjectId(projectId)) {
      res.status(400).json({ message: "Invalid projectId" });
      return;
    }
    if (!mongoose.isValidObjectId(assignedTo)) {
      res.status(400).json({ message: "Invalid assignedTo user id" });
      return;
    }

    const due =
      dueDateRaw instanceof Date
        ? dueDateRaw
        : typeof dueDateRaw === "string"
          ? new Date(dueDateRaw)
          : null;
    if (!due || Number.isNaN(due.getTime())) {
      res.status(400).json({ message: "Valid dueDate is required" });
      return;
    }

    const project = await Project.findOne({
      _id: projectId,
      ...memberProjectIdsFilter(req.user!.id),
    });
    if (!project) {
      res.status(404).json({ message: "Project not found or no access" });
      return;
    }

    const assigneeInProject =
      project.createdBy.toString() === assignedTo ||
      project.members.some((m) => m.toString() === assignedTo);
    if (!assigneeInProject) {
      res.status(400).json({
        message: "Assignee must be a project member or creator",
      });
      return;
    }

    const task = await Task.create({
      title,
      description,
      projectId,
      assignedTo,
      dueDate: due,
      status: "TODO",
    });

    await task.populate("assignedTo", "name email role");
    await task.populate("projectId", "name description");

    res.status(201).json(task);
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(err.statusCode).json({ message: err.message });
      return;
    }
    res.status(500).json({ message: "Server error" });
  }
}

export async function listTasks(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const isAdmin = isAdminRole(req.user!.role);

    let query: Record<string, unknown> = {};

    if (!isAdmin) {
      query.assignedTo = userId;
    } else {
      const filterUserId =
        typeof req.query.userId === "string" ? req.query.userId.trim() : "";
      if (filterUserId) {
        if (!mongoose.isValidObjectId(filterUserId)) {
          res.status(400).json({ message: "Invalid userId query" });
          return;
        }
        query.assignedTo = filterUserId;
      }
    }

    const accessibleProjects = await Project.find(memberProjectIdsFilter(userId))
      .select("_id")
      .lean();
    const projectIds = accessibleProjects.map((p) => p._id);

    const projectFilter =
      typeof req.query.projectId === "string"
        ? req.query.projectId.trim()
        : "";
    if (projectFilter) {
      if (!mongoose.isValidObjectId(projectFilter)) {
        res.status(400).json({ message: "Invalid projectId query" });
        return;
      }
      const allowed = projectIds.some((pid) => pid.toString() === projectFilter);
      if (!allowed) {
        res.status(403).json({ message: "No access to this project" });
        return;
      }
      query.projectId = projectFilter;
    } else {
      query.projectId = { $in: projectIds };
    }

    const tasks = await Task.find(query)
      .populate("assignedTo", "name email role")
      .populate("projectId", "name description")
      .sort({ dueDate: 1 });

    res.json(tasks);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
}

export async function updateTask(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid task id" });
      return;
    }

    const task = await Task.findById(id);
    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    const projDoc = await Project.findById(task.projectId);
    if (!projDoc) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    const userId = req.user!.id;
    const inProject =
      projDoc.createdBy.toString() === userId ||
      projDoc.members.some((m) => m.toString() === userId);

    if (!inProject) {
      res.status(403).json({ message: "No access to this task's project" });
      return;
    }

    const status = req.body?.status;

    if (isAdminRole(req.user!.role)) {
      if (status !== undefined) {
        if (typeof status !== "string" || !STATUSES.includes(status as (typeof STATUSES)[number])) {
          res.status(400).json({
            message: `status must be one of: ${STATUSES.join(", ")}`,
          });
          return;
        }
        task.status = status as (typeof STATUSES)[number];
      }
      if (req.body?.title !== undefined) {
        const t = requireString(req.body.title, "title");
        task.title = t;
      }
      if (req.body?.description !== undefined) {
        task.description =
          typeof req.body.description === "string" ? req.body.description : "";
      }
      if (req.body?.dueDate !== undefined) {
        const d = new Date(req.body.dueDate);
        if (Number.isNaN(d.getTime())) {
          res.status(400).json({ message: "Invalid dueDate" });
          return;
        }
        task.dueDate = d;
      }
      if (req.body?.assignedTo !== undefined) {
        const aid = requireString(req.body.assignedTo, "assignedTo");
        if (!mongoose.isValidObjectId(aid)) {
          res.status(400).json({ message: "Invalid assignedTo" });
          return;
        }
        const ok =
          projDoc.createdBy.toString() === aid ||
          projDoc.members.some((m) => m.toString() === aid);
        if (!ok) {
          res.status(400).json({
            message: "New assignee must belong to the project",
          });
          return;
        }
        task.assignedTo = new mongoose.Types.ObjectId(aid);
      }
    } else {
      // MEMBER (or any non-admin): only assigned tasks; only status field allowed
      if (task.assignedTo.toString() !== userId) {
        res.status(403).json({ message: "You can only update tasks assigned to you" });
        return;
      }
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const extraKeys = Object.keys(body).filter(
        (k) => k !== "status" && body[k as keyof typeof body] !== undefined
      );
      if (extraKeys.length > 0) {
        res.status(403).json({
          message: "Members may only update task status",
        });
        return;
      }
      if (status === undefined) {
        res.status(400).json({ message: "status is required" });
        return;
      }
      if (typeof status !== "string" || !STATUSES.includes(status as (typeof STATUSES)[number])) {
        res.status(400).json({
          message: `status must be one of: ${STATUSES.join(", ")}`,
        });
        return;
      }
      task.status = status as (typeof STATUSES)[number];
    }

    await task.save();
    await task.populate("assignedTo", "name email role");
    await task.populate("projectId", "name description");

    res.json(task);
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(err.statusCode).json({ message: err.message });
      return;
    }
    res.status(500).json({ message: "Server error" });
  }
}
