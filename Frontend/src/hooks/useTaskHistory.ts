import { useState, useEffect } from "react";
import api from "@/lib/api";

export interface TaskChange {
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
}

export interface TaskChangeGroup {
  changeGroupId: string;
  changedAt: string; // includes date and time
  changes: TaskChange[];
}

export const useTaskHistory = (taskId?: number) => {
  const [history, setHistory] = useState<TaskChangeGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) return;

    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get(`/api/task-history/${taskId}`);
        setHistory(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to fetch task history:", err);
        setError("Failed to fetch task history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [taskId]);

  return { history, loading, error };
};
