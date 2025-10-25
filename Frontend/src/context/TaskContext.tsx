import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api from "@/lib/api"; // Axios instance with interceptor

export interface Task {
  id: number;
  projectId: number;
  project?: string;
  owner?: string;
  members: string[];
  title: string;
  description: string;
  dueDate: string;
  status: string;
  url?: string;                // new field
  dependentTaskId?: number;
}

// 🎯 ADDED: Interface for unread counts
interface TaskUnreadCounts {
  [taskId: string]: number; // Maps taskId (string) to unread count (number)
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
  unreadCounts: TaskUnreadCounts;
  markTaskAsRead: (taskId: string) => void;
  incrementUnreadCount: (taskId: string) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshTasks, setRefreshTasks] = useState(false);
  // 🎯 ADDED: State for unread message counts
  const [unreadCounts, setUnreadCounts] = useState<TaskUnreadCounts>({});

  const triggerTaskRefresh = () => {
    setRefreshTasks((prev) => !prev);
  };

  // Fetch all tasks
  const fetchTasks = async () => {
    try {
      const res = await api.get("/tasks"); // Axios automatically attaches token
      setTasks(res.data);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  };

  // Add new task
  const addTask = async (task: Omit<Task, "id">) => {
    try {
      const res = await api.post("/tasks", task);
      setTasks((prev) => [res.data, ...prev]);
      triggerTaskRefresh();
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
      if (prev[taskId] > 0) {
        // In a real app, this would also call a backend API to persist the 'read' state
        return { ...prev, [taskId]: 0 };
      }
      return prev;
    });
  };

  // 🎯 ADDED: Function to increment unread count
  const incrementUnreadCount = (taskId: string) => {
    setUnreadCounts((prev) => ({
      ...prev,
      [taskId]: (prev[taskId] || 0) + 1,
    }));
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