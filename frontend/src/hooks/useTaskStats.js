import { useMemo } from "react";

export function useTaskStats(tasks) {
  return useMemo(() => {
    const list = Array.isArray(tasks) ? tasks : [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const total = list.length;
    const completed = list.filter((t) => t.status === "DONE").length;
    const overdue = list.filter((t) => {
      if (t.status === "DONE") return false;
      const d = new Date(t.dueDate);
      d.setHours(0, 0, 0, 0);
      return d < now;
    }).length;

    return { total, completed, overdue };
  }, [tasks]);
}
