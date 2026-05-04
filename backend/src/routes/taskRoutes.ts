import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/authorize";
import { createTask, listTasks, updateTask } from "../controllers/taskController";

const router = Router();

router.use(authenticate);

router.get("/", listTasks);
router.post("/", requireAdmin, createTask);
router.patch("/:id", updateTask);

export default router;
