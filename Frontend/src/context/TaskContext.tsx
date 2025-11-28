import { notificationService } from "@/hooks/notifications";
import api from "@/lib/api";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  ReactNode,
  createContext,
  useContext,
} from "react";

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
  url?: string;
  dependentTaskId?: number[];
}
interface WsMessage {
  taskId: string;
  currentUser: string;
  payload: Array<{ content?: string }>;
}
interface TaskFilters {
  project?: string;
  owner?: string;
  status?: string;
}


interface UnreadData {
  count: number;
  mention: boolean;
  mentionedUser: string | null;
  senderUser: string | null;
}

interface TaskContextType {
  tasks: Task[];
  fetchTasks: () => Promise<void>;
  searchTasks: (query: string) => Promise<Task[]>;
  addTask: (task: Omit<Task, "id">) => Promise<void>;
  updateTask: (id: number, task: Partial<Task>) => Promise<void>;
  closeTask: (id: number) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  refreshTasks: boolean;
  userStatuses: Record<string, boolean>;
  triggerTaskRefresh: () => void;
  unreadCounts: Record<string, UnreadData>;
  markTaskAsRead: (taskId: string) => void;
  incrementUnreadCount: (
    taskId: string,
    hasMention?: boolean,
    mentionedUser?: string | null,
    senderUser?: string | null
  ) => void;
  latestWsMessage: WsMessage | null;
  registerRefreshHandler: (cb: () => void) => void;
  unregisterRefreshHandler: (cb: () => void) => void;

  // ✅ Add these two
  filters: {
    project: string;
    owner: string;
    status: string;
    projectId?: number | undefined;
  };
  setFilters: React.Dispatch<
    React.SetStateAction<{
      project: string;
      owner: string;
      status: string;
      projectId?: number | undefined;
    }>
  >;
}


const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshTasks, setRefreshTasks] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, UnreadData>>({});
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [latestWsMessage, setLatestWsMessage] = useState<WsMessage | null>(null);
  const [userStatuses, setUserStatuses] = useState<Record<string, boolean>>({});
  const [filters, setFilters] = useState({
  project: "all",
  owner: "all",
  status: "all",
  projectId: undefined,
});


  const refreshHandlers = useRef<Set<() => void>>(new Set());
 const pendingMessagesRef = useRef<WsMessage[]>([]);
  const tasksLoadedRef = useRef(false);
  const connectionAttemptRef = useRef(false);

  // 🔑 Track token dynamically
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem("token"));
  useEffect(() => {
    const interval = setInterval(() => {
      const current = localStorage.getItem("token");
      setAuthToken((prev) => (prev !== current ? current : prev));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const triggerTaskRefresh = () => setRefreshTasks((prev) => !prev);

  // ==========================
  // 🧩 Fetch Tasks
  // ==========================
 const fetchTasks = useCallback(async (filters?: TaskFilters) => {
  try {
    const params = new URLSearchParams();
    params.append("project", filters?.project || "all");
    params.append("owner", filters?.owner || "all");
    params.append("status", filters?.status || "all");

    const res = await api.get(`/tasks?${params.toString()}`);
    setTasks(res.data);
    tasksLoadedRef.current = true;

      // ✅ Process queued WebSocket messages once tasks are ready
      if (pendingMessagesRef.current.length > 0) {
        console.log(`🚀 Processing ${pendingMessagesRef.current.length} queued messages`);
        pendingMessagesRef.current.forEach((msg) => handleWebSocketMessage(msg));
        pendingMessagesRef.current = [];
      }

      return res.data;
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  }, []);
  // ==========================
// 🔍 Search Tasks
// ==========================
const searchTasks = useCallback(async (query: string): Promise<Task[]> => {
  try {
    if (!query.trim()) {
      const all = await fetchTasks();
      return all || [];
    }
    const res = await api.get("/tasks/search", { params: { q: query } });
    return res.data.results || [];
  } catch (err) {
    console.error("Error searching tasks:", err);
    return [];
  }
}, [fetchTasks]);


  // ==========================
  // 🔔 Unread Logic
  // ==========================
  const markTaskAsRead = (taskId: string) => {
    setUnreadCounts((prev) => {
      const prevData = prev[taskId];
      if (prevData && (prevData.count > 0 || prevData.mention)) {
        return {
          ...prev,
          [taskId]: { count: 0, mention: false, mentionedUser: null, senderUser: null },
        };
      }
      return prev;
    });
  };

  const incrementUnreadCount = (
    taskId: string,
    hasMention = false,
    mentionedUser: string | null = null,
    senderUser: string | null = null
  ) => {
    setUnreadCounts((prev) => {
      const prevData = prev[taskId] || {
        count: 0,
        mention: false,
        mentionedUser: null,
        senderUser: null,
      };

      const newData = {
        count: prevData.count + 1,
        mention: prevData.mention || hasMention,
        mentionedUser: mentionedUser || prevData.mentionedUser,
        senderUser: senderUser || prevData.senderUser,
      };

      return { ...prev, [taskId]: newData };
    });
  };

  // ==========================
  // 📌 Manage Handlers (for ChatView refresh)
  // ==========================
  const registerRefreshHandler = (cb: () => void) => {
    refreshHandlers.current.add(cb);
  };
  const unregisterRefreshHandler = (cb: () => void) => {
    refreshHandlers.current.delete(cb);
  };

  // ==========================
  // 🌍 WebSocket Message Processor
  // ==========================
  const handleWebSocketMessage = async (response: WsMessage) => {
    const { taskId, currentUser: senderName, payload } = response;
    const username = localStorage.getItem("username") || "";
    const filteredUsername = username.substring(0, 3).toLowerCase();

    // Ignore self messages
    if (senderName?.toLowerCase() === username.toLowerCase()) return;

    if (localStorage.getItem("opendTaskId") == taskId) {
      return;
    }

    let messageText = "";
    let taskTitle = "";

    if (Array.isArray(payload) && payload.length > 0) {
      const lastMessage = payload[payload.length - 1];
      messageText = lastMessage.content || "";

      const task = tasks.find(t => t.id.toString() === taskId);
    taskTitle = task?.title || "";
    }

    const lastPart = messageText.split(";").pop()?.trim() || "";
    const hasMention = lastPart.toLowerCase().includes(`@${filteredUsername}`);
    // In TaskContext.tsx - Add this after the import
console.log("🔍 NotificationService imported:", { notificationService });
    incrementUnreadCount(taskId, hasMention, hasMention ? filteredUsername : null, senderName);
    notificationService.showMessageNotification(senderName, messageText, taskTitle);
    // ✅ Trigger all registered refresh handlers (ChatView, etc.)
    refreshHandlers.current.forEach((cb) => cb());
  };

  // ==========================
  // 🌍 GLOBAL WEBSOCKET SETUP
  // ==========================
  const connectWebSocket = useCallback(() => {
    const token = localStorage.getItem("token");
    const currentUser = localStorage.getItem("username");
    
    if (!token || !currentUser) {
      console.log("❌ No token or username available for WebSocket connection");
      return;
    }

    // 🚫 PREVENT MULTIPLE CONNECTION ATTEMPTS
    if (connectionAttemptRef.current) {
      console.log("⏸️ WebSocket connection attempt already in progress");
      return;
    }

    // 🚫 PREVENT MULTIPLE ACTIVE CONNECTIONS
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      console.log("✅ WebSocket already connected or connecting");
      return;
    }

    connectionAttemptRef.current = true;
    console.log("🌐 Creating new WebSocket connection...");
    const ws = new WebSocket(import.meta.env.VITE_WS_API_BASE);

    ws.onopen = () => {
      console.log("✅ Global WebSocket connected. Sending INIT...");
      const currentUser = localStorage.getItem("username");
      // Send INIT message immediately after connection
      ws.send(JSON.stringify({ 
        type: "INIT", 
        currentUser: currentUser 
      }));
      setRetryCount(0);
      setSocket(ws);
      connectionAttemptRef.current = false;
      console.log("📤 INIT message sent for user:", currentUser);
    };

    ws.onmessage = async (event) => {
      try {
        const response = JSON.parse(event.data);
        console.log("📨 Global message received:", response);
        setLatestWsMessage(response);

        // 🕓 Tasks not yet loaded — queue message
        if (!tasksLoadedRef.current) {
          console.log("⏳ Tasks not loaded yet, queueing message...");
          pendingMessagesRef.current.push(response);
          return;
        }
        // ✅ Capture USER_STATUS broadcasts
        if (response.type === "USER_STATUS") {
          setUserStatuses((prev) => ({
            ...prev,
            [response.username]: response.status === "online",
          }));
          return; // prevent message handling logic
        }

        // ✅ Process immediately
        handleWebSocketMessage(response);
      } catch (err) {
        console.error("❌ Error parsing WebSocket message:", err);
      }
    };

    ws.onclose = (ev) => {
      console.warn("⚠️ WebSocket disconnected:", ev.code, ev.reason);
      setSocket(null);
      connectionAttemptRef.current = false;
      
      // Only retry if user is still logged in
      if (localStorage.getItem("token")) {
        setTimeout(() => {
          console.log("🔄 Attempting to reconnect WebSocket...");
          setRetryCount((prev) => prev + 1);
          connectWebSocket();
        }, Math.min(5000, (retryCount + 1) * 1000));
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      connectionAttemptRef.current = false;
    };
  }, [socket, retryCount]);

  // ==========================
  // 🎯 LOGIN EVENT LISTENER
  // ==========================
  useEffect(() => {
    const handleUserLoggedIn = () => {
      console.log("🎯 Login event detected, connecting WebSocket...");
      // Clear any existing socket first
      if (socket) {
        console.log("🧹 Cleaning up existing WebSocket connection...");
        socket.close();
        setSocket(null);
      }
      // Wait a bit for localStorage to be fully updated
      setTimeout(() => {
        connectWebSocket();
      }, 300);
    };

    window.addEventListener('userLoggedIn', handleUserLoggedIn);
    return () => window.removeEventListener('userLoggedIn', handleUserLoggedIn);
  }, [connectWebSocket, socket]);

  // ==========================
  // 🔄 TOKEN-BASED CONNECTION MANAGEMENT
  // ==========================
  useEffect(() => {
    const token = localStorage.getItem("token");
    const currentUsername = localStorage.getItem("username");

    if (token && currentUsername) {
      // Only connect if no active connection exists
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.log("🔑 Token available. Connecting global WebSocket...");
        connectWebSocket();
      }
      
      // Fetch tasks
      fetchTasks();
    } else if (!token && socket) {
      console.log("🚪 Token removed. Closing WebSocket...");
      socket.close();
      setSocket(null);
    }
  }, [authToken]);

  // ==========================
  // ✅ CRUDs (kept simple)
  // ==========================
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

  const updateTask = async (id: number, task: Partial<Task>) => {
    try {
      const res = await api.put(`/tasks/${id}`, task);
      setTasks((prev) => prev.map((t) => (t.id === id ? res.data : t)));
      triggerTaskRefresh();
    } catch (err) {
      console.error("Error updating task:", err);
    }
  };

  const closeTask = async (id: number) => {
    try {
      const res = await api.patch(`/tasks/${id}/status`, { status: "Completed" });
      setTasks((prev) => prev.map((t) => (t.id === id ? res.data : t)));
      triggerTaskRefresh();
    } catch (err) {
      console.error("Error closing task:", err);
    }
  };

  const deleteTask = async (id: number) => {
    try {
      await api.delete(`/tasks/${id}`);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      triggerTaskRefresh();
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        fetchTasks,
        searchTasks,
        setFilters,
        filters, 
        addTask,
        updateTask,
        closeTask,
        deleteTask,
        userStatuses,
        refreshTasks,
        triggerTaskRefresh,
        unreadCounts,
        markTaskAsRead,
        incrementUnreadCount,
        latestWsMessage,
        registerRefreshHandler,
        unregisterRefreshHandler,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) throw new Error("useTaskContext must be used within a TaskProvider");
  return context;
};