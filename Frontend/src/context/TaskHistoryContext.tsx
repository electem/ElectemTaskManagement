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
    try {
      const fieldsToCheck = ["status", "dueDate", "owner"];
      const changes: TaskChange[] = [];
      let fieldChnagedvalue=``;
      fieldsToCheck.forEach((field) => {
        if (oldTask?.[field] !== updatedTask?.[field]) {
          changes.push({
            fieldChanged: field,
            oldValue: oldTask?.[field] || "",
            newValue: updatedTask?.[field] || "",
          });
          fieldChnagedvalue =field;
        }
      });

      if (changes.length > 0) {
        await api.post("/task-history", {
          taskId,
          changes,
          changedAt: new Date().toISOString(),
        });

        toast.success("Task changes logged successfully!");

        try {
          let res;
          if(fieldChnagedvalue == "owner"){
             res = await api.post("/auto-message-template/bulk", {
              changes: changes.map((c) => ({
                type: c.fieldChanged,
                from: ``,
                to: ``,
              })),
            });
          }else{
            res = await api.post("/auto-message-template/bulk", {
              changes: changes.map((c) => ({
                type: c.fieldChanged,
                from: c.oldValue,
                to: c.newValue,
              })),
            });
          }


          console.log("📩 AutoMessageTemplates fetched:", res.data);

          if (res.data && res.data.length > 0) {
            const firstTemplate = res.data[0];
            let contents: any[] = JSON.parse(firstTemplate.content);
            let replacingOldOwnerValue =
              `@${localStorage.getItem("username")}` || "Unknown";
            let replacingNewOwnerValue =
              `@${localStorage.getItem("username")}` || "Unknown";
            try {
              const res = await api.get(`/task-history/latest/${taskId}/owner`);

              if (
                res.data &&
                res.data.oldValue != `` &&
                res.data.newValue != `` && res.data.oldValue != null && res.data.newValue != null
              ) {
                replacingOldOwnerValue = `@${res.data.oldValue}`;
                replacingNewOwnerValue = `@${res.data.newValue}`;
              }
            } catch (err) {
              console.warn(
                "⚠️ Failed to fetch latest oldValue, using username instead",
                err
              );
            }

            const username = localStorage.getItem("username") || "Unknown";
            const currentTime = new Date();
            const formattedTime = `${currentTime.getDate()}/${
              currentTime.getMonth() + 1
            } ${currentTime.getHours()}:${currentTime.getMinutes()}`;

            contents = contents.map((msg) => {
              let updatedContent = msg.content;

              if (replacingOldOwnerValue === replacingNewOwnerValue) {
                // Replace only @oldvalue
                updatedContent = updatedContent.replace(
                  /@oldvalue/g,
                  replacingOldOwnerValue
                );

                // Remove @newvalue entirely
                updatedContent = updatedContent.replace(/@newvalue/g, "");
              } else {
                // Normal replacement
                updatedContent = updatedContent
                  .replace(/@oldvalue/g, replacingOldOwnerValue)
                  .replace(/@newvalue/g, replacingNewOwnerValue);
              }

              return {
                ...msg,
                content: `${username}(${formattedTime}): ${updatedContent}`,
              };
            });

            await api.post("/messages/append", {
              taskId,
              currentUser: username,
              contents,
            });

            console.log(
              "✅ Messages appended with dynamic old/new values and timestamp"
            );
            fetchConversation(taskId);
          }
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
function onMessagesUpdated() {
  throw new Error("Function not implemented.");
}
function fetchConversation(taskId: number) {
  throw new Error("Function not implemented.");
}

