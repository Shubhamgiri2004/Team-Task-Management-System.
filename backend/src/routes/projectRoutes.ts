import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/authorize";
import {
  createProject,
  listProjects,
  addMember,
  getProject,
  updateProjectStatus,
} from "../controllers/projectController";

const router = Router();

router.use(authenticate);

router.get("/", listProjects);
router.get("/:id", getProject);
router.patch("/:id/status", updateProjectStatus);
router.post("/", requireAdmin, createProject);
router.post("/:id/add-member", requireAdmin, addMember);

export default router;
