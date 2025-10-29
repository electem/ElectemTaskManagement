import api from "@/lib/api"; // Axios instance  with interceptor
import { useCallback } from "react";
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";

export interface Task {
  id: number;
  projectId: number;
  project?: string;
  owner?: string;
  members: string[];
  title: string;
  description: string;
  dueDate?: string;
  status: string;
  url?: string;                // new field
  dependentTaskId?: number[];

}

// 🎯 ADDED: Interface for unread counts
// interface TaskUnreadCounts {
//   [taskId: string]: number; // Maps taskId (string) to unread count (number)
// }

// ✅ Unified unread structure
interface UnreadData {
  count: number;
  mention: boolean;
  mentionedUser: string | null;
  senderUser: string | null;
}

interface TaskContextType {
  tasks: Task[];
  fetchTasks: () => Promise<void>;
  addTask: (task: Omit<Task, "id">) => Promise<void>;
  updateTask: (id: number, task: Partial<Task>) => Promise<void>;
  closeTask: (id: number) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  refreshTasks: boolean;
  triggerTaskRefresh: () => void;
  // 🎯 ADDED: Unread message state and functions
  unreadCounts: Record<string, UnreadData>;
  markTaskAsRead: (taskId: string) => void;
  incrementUnreadCount: (
    taskId: string,
    hasMention?: boolean,
    mentionedUser?: string | null,
    senderUser?: string | null
  ) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshTasks, setRefreshTasks] = useState(false);
  // 🎯 ADDED: State for unread message counts
  const [unreadCounts, setUnreadCounts] = useState<Record<string, UnreadData>>({});
console.log("tasks",tasks);


  const countedTaskIdsRef = useRef<Set<string>>(new Set());

  const triggerTaskRefresh = () => {
    setRefreshTasks((prev) => !prev);
  };

  // Fetch all tasks
 const fetchTasks = useCallback(async () => {
  try {
    const res = await api.get("/tasks");
    setTasks(res.data);
    return res.data;
  } catch (err) {
    console.error("Error fetching tasks:", err);
  }
}, []);

useEffect(() => {
  countedTaskIdsRef.current.clear();
}, [refreshTasks]);


  // Add new task
  const addTask = async (task: Omit<Task, "id">) => {
    try {
      const res = await api.post("/tasks", task);
      setTasks((prev) => [res.data, ...prev]);
      triggerTaskRefresh();
      return res.data;
    } catch (err) {
      console.error("Error adding task:", err);
    }
  };

  // Update a task
  const updateTask = async (id: number, task: Partial<Task>) => {
    try {
      const res = await api.put(`/tasks/${id}`, task);
      setTasks((prev) => prev.map((t) => (t.id === id ? res.data : t)));
      triggerTaskRefresh();

    } catch (err) {
      console.error("Error updating task:", err);
    }
  };

  // Close (complete) task
  const closeTask = async (id: number) => {
    try {
      const res = await api.patch(`/tasks/${id}/status`, { status: "Completed" });
      setTasks((prev) => prev.map((t) => (t.id === id ? res.data : t)));
      triggerTaskRefresh();
    } catch (err) {
      console.error("Error closing task:", err);
    }
  };

  // Delete task
  const deleteTask = async (id: number) => {
    try {
      await api.delete(`/tasks/${id}`);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      triggerTaskRefresh();
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  // 🎯 ADDED: Function to mark a task's chat as read
  const markTaskAsRead = (taskId: string) => {
    setUnreadCounts((prev) => {
      const prevData = prev[taskId];
  
      // ✅ Only reset if it exists
      if (prevData && (prevData.count > 0 || prevData.mention)) {
        return {
          ...prev,
          [taskId]: { count: 0, mention: false,mentionedUser: null,
            senderUser: null, },
        };
      }
  
      return prev;
    });
  };
  

  // 🎯 ADDED: Function to increment unread count
  // 🎯 UPDATED: Support mention flag
  const incrementUnreadCount = (taskId: string, hasMention = false,  mentionedUser: string | null = null,
    senderUser: string | null = null) => {
    console.log("🟡 incrementUnreadCount called", { taskId, hasMention });
  
    // ✅ Ensure task exists
    console.log("🔢 Checking taskId:", taskId, "typeof:", typeof taskId);

    tasks.forEach((t) => {
      console.log(`➡️ Comparing task.id: ${t.id} (type: ${typeof t.id}) with taskId: ${taskId}`);
    });
    
    const taskExists = tasks.some((t) => t.id.toString() === taskId.toString());
    console.log("🔍 Task exists?", taskExists);
    
    if (!taskExists) {
      console.log("⛔ No task found for ID:", taskId);
      return;
    }
    
  
    // ✅ Prevent duplicate counting
    // if (countedTaskIdsRef.current.has(taskId)) {
    //   console.log("⚠️ Task ID already counted:", taskId);
    //   return;
    // }
  
    countedTaskIdsRef.current.add(taskId);
    console.log("✅ Added task ID to countedTaskIdsRef:", countedTaskIdsRef.current);
  
    setUnreadCounts((prev) => {
      const prevData = prev[taskId] || { count: 0, mention: false,
        mentionedUser: null,
        senderUser: null, };
  
      const newData = {
        count: prevData.count + 1,
        // Keep mention true if already true, or set to true if current message has mention
        mention: prevData.mention || hasMention,
        mentionedUser: mentionedUser || prevData.mentionedUser,
        senderUser: senderUser || prevData.senderUser,
      };
  
      console.log("📊 Updating unread count:", {
        taskId,
        previous: prevData,
        newData,
      });
  
      return {
        ...prev,
        [taskId]: newData,
      };
    });
  };
  



  // Load tasks initially (only if token exists)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) fetchTasks();
  }, []);

  return (
    <TaskContext.Provider
      value={{
        tasks,
        fetchTasks,
        addTask,
        updateTask,
        closeTask,
        deleteTask,
        refreshTasks,
        triggerTaskRefresh,
        // 🎯 ADDED: New context values
        unreadCounts,
        markTaskAsRead,
        incrementUnreadCount,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error("useTaskContext must be used within a TaskProvider");
  }
  return context;
};