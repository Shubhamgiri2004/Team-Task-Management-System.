import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { projectsApi, tasksApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { mongoIdString } from "../utils/mongoId";
import { isAdminRole } from "../utils/roles";

function statusMeta(status) {
  switch (status) {
    case "DONE":
      return {
        label: "Done",
        badge: "bg-emerald-50 text-emerald-800 ring-emerald-200",
        dot: "bg-emerald-500",
      };
    case "OVERDUE":
      return {
        label: "Overdue",
        badge: "bg-amber-50 text-amber-900 ring-amber-200",
        dot: "bg-amber-500",
      };
    default:
      return {
        label: "In progress",
        badge: "bg-blue-50 text-blue-800 ring-blue-200",
        dot: "bg-blue-500",
      };
  }
}

function clampPct(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = isAdminRole(user);

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", description: "" });

  const projectStats = (() => {
    const total = projects.length;
    const done = projects.filter((p) => p.status === "DONE").length;
    const overdue = projects.filter((p) => p.status === "OVERDUE").length;
    return { total, done, overdue };
  })();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError("");
      setLoading(true);
      try {
        const [pRes, tRes] = await Promise.all([
          projectsApi.list(),
          tasksApi.list(),
        ]);
        if (!cancelled) {
          setProjects(pRes.data);
          setTasks(tRes.data);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreateProject(e) {
    e.preventDefault();
    try {
      const { data } = await projectsApi.create(newProject);
      setProjects((prev) => [data, ...prev]);
      setNewProject({ name: "", description: "" });
      setCreating(false);
    } catch (err) {
      setError(err.message || "Could not create project");
    }
  }

  async function handleProjectStatusChange(projectId, status) {
    try {
      const { data } = await projectsApi.updateStatus(projectId, status);
      setProjects((prev) =>
        prev.map((p) => (mongoIdString(p._id) === mongoIdString(projectId) ? data : p))
      );
    } catch (err) {
      setError(err.message || "Could not update project status");
    }
  }

  const statCards = [
    {
      label: "Total projects",
      value: projectStats.total,
      hint: "Projects currently visible to you",
    },
    {
      label: "Done projects",
      value: projectStats.done,
      hint: "All tasks in project are completed",
    },
    {
      label: "Overdue projects",
      value: projectStats.overdue,
      hint: "Has at least one overdue pending task",
    },
  ];

  const tasksByProject = (() => {
    const map = new Map();
    for (const t of tasks) {
      const pid = mongoIdString(t.projectId);
      if (!pid) continue;
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid).push(t);
    }
    return map;
  })();

  const today = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center text-gray-600">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold text-gray-800">
          Hello, {user?.name?.split(" ")[0] || "there"}
        </h1>
        <p className="mt-1 text-gray-600">
          Track work across teams in one calm place.
        </p>
        <p className="mt-3 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm text-gray-600">
          {isAdmin ? (
            <>
              <span className="font-medium text-gray-800">Admin:</span> create
              projects, add team members, create and assign tasks, and edit any
              task in your projects.
            </>
          ) : (
            <>
              <span className="font-medium text-gray-800">Member:</span> view
              projects you belong to and update status on tasks assigned to you.
            </>
          )}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Overview</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm shadow-gray-50"
            >
              <p className="text-sm text-gray-600">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold text-gray-800">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-gray-500">{card.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-800">
            Your projects
          </h2>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setCreating((v) => !v)}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-dark"
            >
              {creating ? "Close form" : "New project"}
            </button>
          )}
        </div>

        {isAdmin && creating && (
          <form
            onSubmit={handleCreateProject}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <p className="mb-4 text-sm text-gray-600">
              Projects you create belong to you; add teammates from the project
              page.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Project name *
                </label>
                <input
                  required
                  value={newProject.name}
                  onChange={(e) =>
                    setNewProject((p) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-800 outline-none ring-brand/30 focus:ring-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newProject.description}
                  onChange={(e) =>
                    setNewProject((p) => ({ ...p, description: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-800 outline-none ring-brand/30 focus:ring-2"
                />
              </div>
            </div>
            <button
              type="submit"
              className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
            >
              Create project
            </button>
          </form>
        )}

        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center text-gray-600">
            {isAdmin
              ? "Create your first project to start assigning tasks."
              : "Ask an admin to add you to a project."}
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {projects.map((p) => {
              const pid = mongoIdString(p._id);
              const projectTasks = tasksByProject.get(pid) || [];
              const totalTasks = projectTasks.length;
              const doneTasks = projectTasks.filter((t) => t.status === "DONE").length;
              const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
              const hasOverdueTask = projectTasks.some((t) => {
                if (t.status === "DONE") return false;
                const due = new Date(t.dueDate);
                if (Number.isNaN(due.getTime())) return false;
                due.setHours(0, 0, 0, 0);
                return due < today;
              });
              const meta = statusMeta(p.status);

              return (
              <li key={p._id}>
                <Link
                  to={`/projects/${p._id}`}
                  className={[
                    "block rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md",
                    hasOverdueTask
                      ? "border-amber-200 hover:border-amber-300"
                      : "border-gray-100 hover:border-brand/40",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-text">
                        {p.name}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm text-text/70">
                        {p.description || "No description"}
                      </p>
                    </div>
                    <span
                      className={[
                        "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ring-1",
                        meta.badge,
                      ].join(" ")}
                      title={`Project status: ${meta.label}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-text/70">
                      <span>
                        Progress{" "}
                        <span className="font-medium text-text">
                          {doneTasks}/{totalTasks}
                        </span>
                      </span>
                      <span className="font-medium text-text">{clampPct(pct)}%</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand to-secondary"
                        style={{ width: `${clampPct(pct)}%` }}
                      />
                    </div>
                    {hasOverdueTask && (
                      <p className="mt-2 text-xs font-medium text-amber-800">
                        This project has overdue tasks.
                      </p>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-gray-500">
                    {Array.isArray(p.members) ? p.members.length : 0}{" "}
                    members ·{" "}
                    {
                      tasks.filter(
                        (t) =>
                          mongoIdString(t.projectId) === mongoIdString(p._id)
                      ).length
                    }{" "}
                    visible tasks
                  </p>
                </Link>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm">
                  <div className="flex items-center gap-2 text-xs text-text/70">
                    <span className="font-medium text-text">Status</span>
                    <span>·</span>
                    <span>Members can mark Done/Overdue</span>
                  </div>
                  <select
                    value={p.status || "IN_PROGRESS"}
                    onChange={(e) =>
                      handleProjectStatusChange(mongoIdString(p._id), e.target.value)
                    }
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-text outline-none ring-brand/30 focus:ring-2"
                  >
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="DONE">Done</option>
                    <option value="OVERDUE">Overdue</option>
                  </select>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
