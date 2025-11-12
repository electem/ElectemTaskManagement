import { createContext, useContext, ReactNode } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { log } from "console";
import { useConversationContext } from "./ConversationProvider";

export interface TaskChange {
  fieldChanged: string;
  oldValue: string;
  newValue: string;
}
export interface TaskMinimal {
  id?: number;
  title?: string;
  description?: string;
  status?: string;
  dueDate?: string;
  owner?: string;
  [key: string]: unknown; // optional, allows extra fields safely
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
    oldTask: TaskMinimal,
    updatedTask: TaskMinimal
  ) => Promise<void>;
  fetchTaskHistory: (taskId: number) => Promise<TaskHistoryResponse | null>;
}

const TaskHistoryContext = createContext<TaskHistoryContextType | undefined>(
  undefined
);

export const TaskHistoryProvider = ({ children }: { children: ReactNode }) => {
  const { fetchConversation } = useConversationContext();
  const logTaskHistory = async (
    taskId: number,
    oldTask: TaskMinimal,
    updatedTask: TaskMinimal
  ) => {
    console.log("▶️ logTaskHistory triggered", {
      taskId,
      oldTask,
      updatedTask,
    });

    try {
      const fieldsToCheck = ["status", "dueDate", "owner"];
      const changes: TaskChange[] = [];

      fieldsToCheck.forEach((field) => {
        if (oldTask?.[field] !== updatedTask?.[field]) {
          console.log(`✅ Field changed → ${field}`, {
            oldValue: oldTask?.[field],
            newValue: updatedTask?.[field],
          });

          changes.push({
            fieldChanged: field,
            oldValue: oldTask?.[field] || "",
            newValue: updatedTask?.[field] || "",
          });
        }
      });

      if (changes.length === 0) {
        console.log("ℹ️ No changes detected. Exiting logTaskHistory.");
        return;
      }

      console.log("📦 Final Changes:", changes);

      await api.post("/task-history", {
        taskId,
        changes,
        changedAt: new Date().toISOString(),
        currentUser: localStorage.getItem("username"),
      });

      toast.success("Task  changes logged successfully!");
      console.log("✅ Task history logged.");
      fetchConversation(taskId);
    } catch (error) {
      console.error("❌ Failed to log task history:", error);
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
function onMessagesUpdated() {
  throw new Error("Function not implemented.");
}
function fetchConversation(taskId: number) {
  throw new Error("Function not implemented.");
}
