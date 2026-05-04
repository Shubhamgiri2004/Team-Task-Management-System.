import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import projectRoutes from "./routes/projectRoutes";
import taskRoutes from "./routes/taskRoutes";

export function createApp() {
  const app = express();

  const origin = process.env.FRONTEND_URL || "*";
  app.use(
    cors({
      origin,
      credentials: true,
    })
  );
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/auth", authRoutes);
  app.use("/projects", projectRoutes);
  app.use("/tasks", taskRoutes);

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  );

  return app;
}
