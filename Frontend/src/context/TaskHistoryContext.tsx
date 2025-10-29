import { createContext, useContext, ReactNode } from "react";
import { toast } from "sonner";
import api from "@/lib/api";

export interface TaskChange {
  fieldChanged: string;
  oldValue: string;
  newValue: string;
}

export interface TaskChangeGroup {
  changeGroupId: string;
  changedAt: string;
  changes: TaskChange[];
}

export interface TaskHistoryResponse {
  taskId: number;
  totalGroups: number;
  history: TaskChangeGroup[];
}

interface TaskHistoryContextType {
  logTaskHistory: (
    taskId: number,
    oldTask: any,
    updatedTask: any
  ) => Promise<void>;
  fetchTaskHistory: (taskId: number) => Promise<TaskHistoryResponse | null>;
}

const TaskHistoryContext = createContext<TaskHistoryContextType | undefined>(
  undefined
);

export const TaskHistoryProvider = ({ children }: { children: ReactNode }) => {
  const logTaskHistory = async (
    taskId: number,
    oldTask: any,
    updatedTask: any
  ) => {
    try {
      const fieldsToCheck = ["status", "dueDate", "owner"];
      const changes: TaskChange[] = [];

      fieldsToCheck.forEach((field) => {
        if (oldTask?.[field] !== updatedTask?.[field]) {
          changes.push({
            fieldChanged: field,
            oldValue: oldTask?.[field] || "",
            newValue: updatedTask?.[field] || "",
          });
        }
      });

      if (changes.length > 0) {
        await api.post("/task-history", {
          taskId,
          changes,
          changedAt: new Date().toISOString(),
        });
        toast.success("Task changes logged successfully!");
        // 🔹 Fetch all matching AutoMessageTemplates in a single call
        try {
          const res = await api.post("/auto-message-template/bulk", {
            changes: changes.map((c) => ({
              type: c.fieldChanged,
              from: c.oldValue,
              to: c.newValue,
            })),
          });
          console.log("📩 AutoMessageTemplates fetched:", res.data);
        } catch (fetchErr) {
          console.warn("⚠️ Error fetching AutoMessageTemplates:", fetchErr);
        }
      }
    } catch (error) {
      console.error("Failed to log task history:", error);
      toast.error("Failed to log task history");
    }
  };

  const fetchTaskHistory = async (taskId: number) => {
    try {
      const res = await api.get(`/task-history/${taskId}`);
      return res.data;
    } catch (error) {
      console.error("Failed to fetch task history:", error);
      toast.error("Failed to fetch task history");
      return null;
    }
  };

  return (
    <TaskHistoryContext.Provider value={{ logTaskHistory, fetchTaskHistory }}>
      {children}
    </TaskHistoryContext.Provider>
  );
};

export const useTaskHistory = () => {
  const context = useContext(TaskHistoryContext);
  if (!context)
    throw new Error("useTaskHistory must be used within a TaskHistoryProvider");
  return context;
};
