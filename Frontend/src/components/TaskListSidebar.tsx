import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronDown,
  ChevronRight,
  ListTodo,
  Loader2,
  User,
  CheckCircle,
  Calendar,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getTasks, updateTask } from "@/services/taskService";
import { Navigate, useNavigate } from "react-router-dom";
// 🎯 MODIFIED: Destructure unreadCounts and markTaskAsRead
import { useTaskContext } from "@/context/TaskContext";
import { useTaskHistory } from "@/context/TaskHistoryContext";
import { useUsers } from "@/hooks/useUsers";


interface ProjectRel {
  id: number;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}
// --- INTERFACES ---
interface Task {
  id: string;
  project: string;
  owner: string;
  members: string[];
  title: string;
  description: string;
  dueDate: string;
  status: string;
  projectRel?: ProjectRel;
}

interface TaskListSidebarProps {
  sidebarOpen: boolean;
}

// --- STATUS COLORS ---
const statusColors: Record<string, string> = {
  Pending:
    "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900",
  "In Progress":
    "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900",
  "Partially Clear":
    "text-gray-700 bg-gray-300 dark:text-gray-400 dark:bg-gray-800",
  Completed:
    "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900",
  "On Hold":
    "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900",
  Cancelled:
    "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900",
  Draft:
    "text-gray-600 bg-cyan-200 dark:text-gray-400 dark:bg-gray-800",
  Reviewed:
    "text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900",
  Tested:
    "text-green-700 bg-green-100 dark:text-green-500 dark:bg-green-900",
  "Needs Validation":
    "text-orange-500 bg-orange-100 dark:text-orange-400 dark:bg-orange-900",
  "Reviewed by Vinod":
    "text-teal-600 bg-teal-100 dark:text-teal-400 dark:bg-teal-900",
  "Changes Requested":
    "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900",
     Paused:
    "text-lime-700 bg-lime-100 dark:text-lime-400 dark:bg-lime-900",
  Bug:
    "text-emerald-700 bg-emerald-300 dark:text-emerald-400 dark:bg-emerald-900",
  default:
    "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800",
};


// --- TASK DETAIL COMPONENT ---
interface TaskDetailProps {
  task: Task;
  onUpdate: (id: string, updates: Partial<Task>) => void;
}

const TaskDetailComponent: React.FC<TaskDetailProps> = ({ task, onUpdate }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [localDueDate, setLocalDueDate] = useState(task.dueDate);
  const truncateDescription = (desc: string, limit: number) => {
    return desc.length > limit ? desc.substring(0, limit) + "..." : desc;
  };
  const { users, loading: usersLoading } = useUsers();
  const { logTaskHistory } = useTaskHistory(); // hook

  // Keep track of previous values
  const prevValuesRef = React.useRef({
    status: task.status,
    owner: task.owner,
    dueDate: task.dueDate,
  });
  const handleDropdownChange = async (field: keyof Task, value: string) => {
    if (task[field] === value || isUpdating) return;
    setIsUpdating(true);

    const updates = { [field]: value };

    try {
      // Update backend
      await updateTask(Number(task.id), updates);
      onUpdate(task.id, updates);

      // Show toast
      let message = "";
      if (field === "owner") message = `Task owner changed to ${value}.`;
      else if (field === "status") message = `Task status updated to "${value}".`;
      else if (field === "dueDate") message = `Due date updated to ${value}.`;
      toast.success(message);

      // Prepare single-field updated task for history
      const updatedTask = { ...task, ...updates };

      // Log history for **only the changed field**
      await logTaskHistory(
        Number(task.id),
        { [field]: prevValuesRef.current[field] }, // old value
        { [field]: value } // new value
      );

      // Update previous values
      prevValuesRef.current[field] = value;

    } catch (error) {
      console.error("Task update failed:", error);
      toast.error("Failed to update task. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Due date handler
  const handleDueDateChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newDate = e.target.value;
    setLocalDueDate(newDate);
    await handleDropdownChange("dueDate", newDate);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-b-lg border-t border-gray-200 dark:border-gray-700 space-y-3">
      {/* Title */}
      <div>
        <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
          {task.title}
        </p>
      </div>

      {/* Description */}
      <div>
        <p className="text-xs text-gray-700 dark:text-gray-300">
          {truncateDescription(task.description, 300)}
        </p>
      </div>

      {/* Due Date (now editable) */}
      <div className="flex items-center space-x-2">
        <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <div className="flex flex-col w-full">
          <input
            type="date"
            value={localDueDate ? localDueDate.split("T")[0] : ""}
            onChange={handleDueDateChange}
            disabled={isUpdating}
            className="text-xs p-1 rounded border border-gray-300 dark:border-gray-600 bg-transparent"
          />
        </div>
      </div>

      {/* Owner Dropdown */}
      <div className="flex items-center space-x-2">
        <User className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <Select
          value={task.owner}
          onValueChange={(value) => handleDropdownChange("owner", value)}
          disabled={isUpdating || usersLoading}
        >
          <SelectTrigger className="w-full h-8 text-xs">
            <SelectValue placeholder="Select Owner" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.username} className="text-sm">
                {user.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status Dropdown */}
      <div className="flex items-center space-x-2">
        <CheckCircle className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <Select
          value={task.status}
          onValueChange={(value) => handleDropdownChange("status", value)}
          disabled={isUpdating}
        >
          <SelectTrigger className="w-full h-8 text-xs">
            <SelectValue placeholder="Select Status" />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(statusColors).map((status) => (
              <SelectItem
                key={status}
                value={status}
                className={`text-sm ${statusColors[status]}`}
              >
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isUpdating && (
        <div className="flex items-center justify-end text-xs text-blue-500 dark:text-blue-400">
          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          Saving...
        </div>
      )}
    </div>
  );
};

// --- MAIN SIDEBAR COMPONENT ---
export const TaskListSidebar: React.FC<TaskListSidebarProps> = ({
  sidebarOpen,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const navigate = useNavigate();
  // 🎯 MODIFIED: Destructure unreadCounts and markTaskAsRead
  const { refreshTasks, unreadCounts, markTaskAsRead } = useTaskContext();
  const username = localStorage.getItem("username");

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedTasks = await getTasks();
      setTasks(
        fetchedTasks.map((t) => ({
          ...t,
          id: t.id.toString(), // ✅ convert number → string
        }))
      );
    } catch (error) {
      toast.error("Could not fetch tasks.");
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [refreshTasks, loadTasks]);

  const handleTaskUpdate = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === id ? { ...task, ...updates } : task))
    );
  }, []);

  // 🎯 UPDATED: Mark chat as read when toggling/opening the task
  const handleToggle = (taskId: string) => {
    setExpandedTaskId((prevId) => (prevId === taskId ? null : taskId));
  };

  const openChat = (task: Task) => {
    markTaskAsRead(task.id);
    navigate(`/tasks/`);
    navigate(`/tasks/${task.id}/${task.title}/chat`);
  };

  if (!sidebarOpen) {
    return (
      <div className="p-3">
        <ListTodo className="h-6 w-6 text-gray-600 dark:text-gray-300" />
      </div>
    );
  }

  const sortedTasks = [...tasks].sort((a, b) => {
    // 1️⃣ Priority: tasks owned by current user go first
    const aIsOwner = a.owner === username ? 1 : 0;
    const bIsOwner = b.owner === username ? 1 : 0;

    if (aIsOwner !== bIsOwner) {
      return bIsOwner - aIsOwner; // owner task first
    }

    // 2️⃣ Existing status order
    const order = { "To Do": 1, "In Progress": 2, Done: 3 };
    return (order[a.status] || 4) - (order[b.status] || 4);
  });


  // 🔹 Filter tasks where current user is a member
  const filteredTasks = sortedTasks.filter(
    (task) =>
      (task.members.includes(username) || task.owner.includes(username)) &&
      !["Cancelled", "Completed"].includes(task.status) &&
      !task.projectRel.name.toLowerCase().startsWith("int") // ✅ use projectRel.name
  );




  return (
    <div className="px-2 space-y-2 ">

      <div className="space-y-1">
        {loading ? (
          <div className="flex items-center justify-center p-4 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading Tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 p-4">
            No tasks found.
          </p>
        ) : (
          filteredTasks.map((task) => {
            const taskIdStr = task.id;
            // 🎯 GET UNREAD COUNT
            const unreadCount = unreadCounts[taskIdStr] || 0;

            return (
              <div
                key={task.id}
                className="rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
              >

                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2 overflow-hidden">
                    {expandedTaskId === task.id ? (
                      <ChevronDown className="h-4 w-4 flex-shrink-0 text-primary" />
                    ) : (
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                    )}
                    <div className="flex items-center max-w-[160px] overflow-hidden">
                      <Button
                        variant="ghost"
                        onClick={() => handleToggle(task.id)}
                        className={`flex-shrink h-auto px-3 py-2 justify-start transition-colors whitespace-nowrap overflow-hidden text-ellipsis ${expandedTaskId === task.id
                            ? 'bg-gray-100 dark:bg-gray-700'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                      >
                        <span className="text-sm font-medium truncate max-w-[120px]">{task.title}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => openChat(task)}
                        className={`flex-shrink-0 ml-1 h-auto p-2 transition-colors ${expandedTaskId === task.id
                            ? 'bg-gray-100 dark:bg-gray-700'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                      >
                        <div className="relative flex items-center">
                          <MessageCircle
                            className={`h-4 w-4 ${unreadCounts[taskIdStr]?.mention
                                ? "text-green-500"
                                : unreadCounts[taskIdStr]?.count > 0
                                  ? "text-red-500"
                                  : "text-gray-500 dark:text-gray-400"
                              }`}
                          />

                          {/* 🟢 Badge with Sender Initial + Count */}
                          {unreadCounts[taskIdStr]?.count > 0 && (
                            <span
                              className={`absolute -top-1 -right-2 text-white text-[10px] font-bold rounded-full px-1.5 py-[1px] flex items-center justify-center gap-[2px] animate-pulse ${unreadCounts[taskIdStr]?.mention ? "bg-green-500" : "bg-red-500"
                                }`}
                            >
                              {/* Sender's first letter */}
                              {unreadCounts[taskIdStr]?.senderUser?.charAt(0).toUpperCase()}

                              {/* Count */}
                              {unreadCounts[taskIdStr].count > 9
                                ? "9+"
                                : unreadCounts[taskIdStr].count}
                            </span>
                          )}
                        </div>



                      </Button>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold rounded-full px-2 py-0.5 ml-2 flex-shrink-0 ${statusColors[task.status] || statusColors.default
                      }`}
                  >
                    {task.status}
                  </span>
                </div>


                {expandedTaskId === task.id && (
                  <TaskDetailComponent task={task} onUpdate={handleTaskUpdate} />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TaskListSidebar;