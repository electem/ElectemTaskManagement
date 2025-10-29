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
  const { fetchConversation } = useConversationContext();
  const logTaskHistory = async (
    taskId: number,
    oldTask: any,
    updatedTask: any
  ) => {
    console.log("▶️ logTaskHistory triggered", { taskId, oldTask, updatedTask });

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
      });

      toast.success("Task  changes logged successfully!");
      console.log("✅ Task history logged.");

      let payload = changes.map((c) => ({
        type: c.fieldChanged,
        from: c.fieldChanged === "owner" ? null : c.oldValue,
        to: c.fieldChanged === "owner" ? null : c.newValue,
      }));

      console.log("📨 Sending payload to /auto-message-template/bulk", payload);

      const templatesRes = await api.post("/auto-message-template/bulk", {
        changes: payload,
      });

      console.log("📩 AutoMessageTemplates fetched:", templatesRes.data);

      const templates = templatesRes.data;
      if (!templates || templates.length === 0) {
        console.log("ℹ️ No templates returned.");
        return;
      }

      const username = localStorage.getItem("username") || "Unknown";
      const currentTime = new Date();
      const formattedTime = `${currentTime.getDate()}/${
        currentTime.getMonth() + 1
      } ${currentTime.getHours()}:${currentTime.getMinutes()}`;

      // ✅ Build all messages
      let contentsToAppend: any[] = await Promise.all(
        changes.map(async (change) => {
          const template = templates.find(
            (t: any) => t.type === change.fieldChanged
          );

          if (!template) {
            console.warn(
              `⚠️ No template found for type → ${change.fieldChanged}`
            );
            return null;
          }

          console.log("✅ Template selected:", template);

          let messages = JSON.parse(template.content);

          let replacingOldValue = `@${username}`;
          let replacingNewValue = `@${username}`;

          if (change.fieldChanged === "owner") {
            try {
              const ownerRes = await api.get(
                `/task-history/latest/${taskId}/owner`
              );

              if (
                ownerRes.data?.oldValue &&
                ownerRes.data?.newValue
              ) {
                replacingOldValue = `@${ownerRes.data.oldValue}`;
                replacingNewValue = `@${ownerRes.data.newValue}`;
              } else {
                replacingOldValue = `@${username}`;
                replacingNewValue = `@${username}`;
              }
            } catch (err) {
              console.warn(
                "⚠️ Failed to fetch latest owner values, using username",
                err
              );
              replacingOldValue = `@${username}`;
              replacingNewValue = `@${username}`;
            }
          }

          console.log("🔄 Replacement:", {
            replacingOldValue,
            replacingNewValue,
          });

          return messages.map((msg: any) => {
            let updatedContent = msg.content;

            if (replacingOldValue === replacingNewValue) {
              updatedContent = updatedContent.replace(
                /@oldowner/g,
                replacingOldValue
              );
              updatedContent = updatedContent.replace(/@newowner/g, "");
            } else {
              updatedContent = updatedContent
                .replace(/@oldowner/g, replacingOldValue)
                .replace(/@newowner/g, replacingNewValue);
            }

            return {
              ...msg,
              content: `${username}(${formattedTime}): ${updatedContent}`,
            };
          });
        })
      );

      contentsToAppend = contentsToAppend.flat().filter(Boolean);

      if (contentsToAppend.length > 0) {
        console.log("📝 Final Message Content:", contentsToAppend);

        await api.post("/messages/append", {
          taskId,
          currentUser: username,
          contents: contentsToAppend,
        });

        console.log("✅ Messages appended successfully.");
        fetchConversation(taskId);
      }
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
