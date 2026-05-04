import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { projectsApi, tasksApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { mongoIdString } from "../utils/mongoId";
import { isAdminRole } from "../utils/roles";

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ProjectPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const isAdmin = isAdminRole(user);

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [memberEmail, setMemberEmail] = useState("");

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assignedTo: "",
    dueDate: "",
  });

  async function reload() {
    setError("");
    const [projRes, taskRes] = await Promise.all([
      projectsApi.get(projectId),
      tasksApi.list({ projectId }),
    ]);
    setProject(projRes.data);
    setTasks(taskRes.data);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        await reload();
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load project");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when id changes only
  }, [projectId]);

  const assigneeOptions = useMemo(() => {
    if (!project) return [];
    const map = new Map();
    const add = (u) => {
      if (!u?.email) return;
      const id = u._id || u.id;
      if (id && !map.has(id)) map.set(id, u);
    };
    if (project.createdBy && typeof project.createdBy === "object") {
      add(project.createdBy);
    }
    (project.members || []).forEach(add);
    return [...map.values()];
  }, [project]);

  async function handleAddMember(e) {
    e.preventDefault();
    try {
      const { data } = await projectsApi.addMember(projectId, memberEmail);
      setProject(data);
      setMemberEmail("");
    } catch (err) {
      setError(err.message || "Could not add member");
    }
  }

  async function handleCreateTask(e) {
    e.preventDefault();
    try {
      const payload = {
        title: taskForm.title,
        description: taskForm.description,
        projectId,
        assignedTo: taskForm.assignedTo,
        dueDate: new Date(taskForm.dueDate).toISOString(),
      };
      const { data } = await tasksApi.create(payload);
      setTasks((prev) => [...prev, data]);
      setTaskForm({
        title: "",
        description: "",
        assignedTo: "",
        dueDate: "",
      });
    } catch (err) {
      setError(err.message || "Could not create task");
    }
  }

  async function handleStatusChange(taskId, status) {
    try {
      const { data } = await tasksApi.update(taskId, { status });
      setTasks((prev) => prev.map((t) => (t._id === taskId ? data : t)));
    } catch (err) {
      setError(err.message || "Could not update task");
    }
  }

  async function handleAssignChange(taskId, assignedTo) {
    if (!isAdmin) return;
    try {
      const { data } = await tasksApi.update(taskId, { assignedTo });
      setTasks((prev) => prev.map((t) => (t._id === taskId ? data : t)));
    } catch (err) {
      setError(err.message || "Could not reassign task");
    }
  }

  if (loading || !project) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center text-gray-600">
        {error ? (
          <>
            <p>{error}</p>
            <Link
              to="/dashboard"
              className="mt-4 inline-block text-gray-800 underline"
            >
              Back to dashboard
            </Link>
          </>
        ) : (
          "Loading project…"
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/dashboard"
          className="text-sm font-medium text-gray-600 underline hover:text-gray-800"
        >
          ← Dashboard
        </Link>
        <h1 className="mt-4 text-3xl font-semibold text-gray-800">
          {project.name}
        </h1>
        <p className="mt-2 text-gray-600">{project.description || ""}</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">Team</h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {assigneeOptions.map((m) => (
            <li
              key={m._id || m.id}
              className="rounded-full bg-brand-light px-3 py-1 text-sm text-brand"
            >
              {m.name}{" "}
              <span className="text-gray-600">
                ({(m.role || "").toLowerCase()})
              </span>
            </li>
          ))}
        </ul>

        {isAdmin && (
          <form className="mt-6 flex flex-wrap gap-2" onSubmit={handleAddMember}>
            <input
              type="email"
              required
              placeholder="Member email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              className="min-w-[200px] flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
            />
            <button
              type="submit"
              className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
            >
              Add member
            </button>
          </form>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Tasks</h2>

        {isAdmin && (
          <form
            onSubmit={handleCreateTask}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <h3 className="font-medium text-gray-800">Create task</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm text-gray-700">Title</label>
                <input
                  required
                  value={taskForm.title}
                  onChange={(e) =>
                    setTaskForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm text-gray-700">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={taskForm.description}
                  onChange={(e) =>
                    setTaskForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-700">
                  Assign to
                </label>
                <select
                  required
                  value={taskForm.assignedTo}
                  onChange={(e) =>
                    setTaskForm((f) => ({
                      ...f,
                      assignedTo: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
                >
                  <option value="">Select member…</option>
                  {assigneeOptions.map((m) => {
                    const id = m._id || m.id;
                    return (
                      <option key={id} value={id}>
                        {m.name}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-700">
                  Due date
                </label>
                <input
                  type="date"
                  required
                  value={taskForm.dueDate}
                  onChange={(e) =>
                    setTaskForm((f) => ({ ...f, dueDate: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
                />
              </div>
            </div>
            <button
              type="submit"
              className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
            >
              Save task
            </button>
          </form>
        )}

        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center text-gray-600">
            No tasks in this view yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {tasks.map((t) => {
              const assignee = t.assignedTo;
              const assigneeId = mongoIdString(assignee);
              const mine =
                assigneeId === mongoIdString(user?.id || user?._id);
              const canEditStatus = isAdmin || mine;

              return (
                <li
                  key={t._id}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800">{t.title}</h3>
                      {t.description && (
                        <p className="mt-1 text-sm text-gray-600">
                          {t.description}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-gray-500">
                        Due {formatDate(t.dueDate)}
                      </p>
                      {typeof assignee === "object" && assignee && (
                        <p className="mt-1 text-sm text-gray-700">
                          Assigned to {assignee.name}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 sm:w-52">
                      <label className="text-xs uppercase tracking-wide text-gray-500">
                        Status
                      </label>
                      <select
                        value={t.status}
                        disabled={!canEditStatus}
                        onChange={(e) =>
                          handleStatusChange(t._id, e.target.value)
                        }
                        className="rounded-xl border border-gray-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-50"
                      >
                        <option value="TODO">To do</option>
                        <option value="IN_PROGRESS">In progress</option>
                        <option value="DONE">Done</option>
                      </select>

                      {isAdmin && (
                        <>
                          <label className="text-xs uppercase tracking-wide text-gray-500">
                            Assignee
                          </label>
                          <select
                            value={assigneeId || ""}
                            onChange={(e) =>
                              handleAssignChange(t._id, e.target.value)
                            }
                            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                          >
                            {assigneeOptions.map((m) => {
                              const id = m._id || m.id;
                              return (
                                <option key={id} value={id}>
                                  {m.name}
                                </option>
                              );
                            })}
                          </select>
                        </>
                      )}
                    </div>
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
