import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { tasksApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { mongoIdString } from "../utils/mongoId";
import { isAdminRole } from "../utils/roles";

export default function TasksPage() {
  const { user } = useAuth();
  const isAdmin = isAdminRole(user);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterUserId, setFilterUserId] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const params =
          isAdmin && filterUserId.trim() ? { userId: filterUserId.trim() } : {};
        const { data } = await tasksApi.list(params);
        if (!cancelled) setTasks(data);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load tasks");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, filterUserId]);

  async function handleStatusChange(taskId, status) {
    try {
      const { data } = await tasksApi.update(taskId, { status });
      setTasks((prev) => prev.map((t) => (t._id === taskId ? data : t)));
    } catch (err) {
      setError(err.message || "Update failed");
    }
  }

  function assigneeMine(t) {
    return mongoIdString(t.assignedTo) === mongoIdString(user?.id || user?._id);
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center text-gray-600">
        Loading tasks…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-800">
            Task management
          </h1>
          <p className="mt-1 text-gray-600">
            All tasks you can access in one table.
          </p>
        </div>
        <Link
          to="/dashboard"
          className="text-sm font-medium text-gray-600 underline hover:text-gray-800"
        >
          ← Dashboard
        </Link>
      </div>

      {isAdmin && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700">
            Filter by assignee (user Mongo ID)
          </label>
          <input
            type="text"
            placeholder="Optional userId..."
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            className="mt-2 w-full max-w-lg rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
          />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-600">
          Nothing to show. Join a project and create or receive tasks.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
          <table className="w-full divide-y divide-gray-100 bg-white text-left text-sm">
            <thead className="bg-gray-50/80 text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3 hidden sm:table-cell">Project</th>
                <th className="px-4 py-3 hidden md:table-cell">Assignee</th>
                <th className="px-4 py-3 hidden md:table-cell">Due</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((t) => {
                const pname =
                  typeof t.projectId === "object" && t.projectId
                    ? t.projectId.name
                    : "";
                const pid = mongoIdString(t.projectId);
                const aname =
                  typeof t.assignedTo === "object" && t.assignedTo
                    ? t.assignedTo.name
                    : "";
                const canStatus = isAdmin || assigneeMine(t);

                return (
                  <tr key={t._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {t.title}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                      {pid ? (
                        <Link
                          to={`/projects/${pid}`}
                          className="underline hover:text-gray-900"
                        >
                          {pname || "Open"}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      {aname || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      {t.dueDate
                        ? new Date(t.dueDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={t.status}
                        disabled={!canStatus}
                        onChange={(e) =>
                          handleStatusChange(t._id, e.target.value)
                        }
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:bg-gray-50"
                      >
                        <option value="TODO">To do</option>
                        <option value="IN_PROGRESS">In progress</option>
                        <option value="DONE">Done</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
