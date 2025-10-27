import { createContext, useContext, ReactNode } from "react";
import { toast } from "sonner";
import api from "@/lib/api"; // Axios instance with baseURL and interceptors

interface TaskChange {
  fieldChanged: string;
  oldValue: string;
  newValue: string;
}

interface TaskHistoryContextType {
  logTaskHistory: (
    taskId: number,
    oldTask: any,
    updatedTask: any
  ) => Promise<void>;
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

      // ✅ Only call API if at least one field has changed
      if (changes.length > 0) {
        await api.post("/task-history", {
          taskId,
          changes,
          changedAt: new Date().toISOString(),
        });
        toast.success("Task changes logged successfully!");
      }
    } catch (error) {
      console.error("Failed to log task history:", error);
      toast.error("Failed to log task history");
    }
  };

  return (
    <TaskHistoryContext.Provider value={{ logTaskHistory }}>
      {children}
    </TaskHistoryContext.Provider>
  );
};

export const useTaskHistory = () => {
  const context = useContext(TaskHistoryContext);
  if (!context)
    throw new Error(
      "useTaskHistory must be used within a TaskHistoryProvider"
    );
  return context;
};
