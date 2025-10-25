import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronDown,
  ChevronRight,
  ListTodo,
  Loader2,
  User,
  CheckCircle,
  Calendar,
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
}

interface TaskListSidebarProps {
  sidebarOpen: boolean;
}

// --- STATUS COLORS ---
const statusColors: Record<string, string> = {
  "To Do":
    "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900",
  "In Progress":
    "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900",
  Done: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900",
  Pending:
    "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900",
  Completed:
    "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900",
  "On Hold":
    "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900",
  Cancelled: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900",
  Approved: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900",
  Rejected: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900",
  default: "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800",
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

  const handleDropdownChange = async (field: keyof Task, value: string) => {
    if (task[field] === value || isUpdating) return;
    setIsUpdating(true);

    const updates = { [field]: value };

    try {
      await updateTask(Number(task.id), updates);
      onUpdate(task.id, updates);

      let message = "";
      if (field === "owner") {
        message = `Task owner changed to ${value}.`;
      } else if (field === "status") {
        message = `Task status updated to "${value}".`;
      } else if (field === "dueDate") {
        message = `Due date updated to ${value}.`;
      }
      toast.success(message);
    } catch (error) {
      console.error("Task update failed:", error);
      toast.error("Failed to update task. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle due date change
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
        <h4 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
          Title
        </h4>
        <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
          {task.title}
        </p>
      </div>

      {/* Description */}
      <div>
        <h4 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
          Description
        </h4>
        <p className="text-xs text-gray-700 dark:text-gray-300">
          {truncateDescription(task.description, 300)}
        </p>
      </div>

      {/* Due Date (now editable) */}
      <div className="flex items-center space-x-2">
        <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <div className="flex flex-col w-full">
          <h4 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            Due Date
          </h4>
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
          disabled={isUpdating}
        >
          <SelectTrigger className="w-full h-8 text-xs">
            <SelectValue placeholder="Select Owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={task.owner} className="text-sm">
              {task.owner}
            </SelectItem>
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
    markTaskAsRead(taskId);
    setExpandedTaskId((prevId) => (prevId === taskId ? null : taskId));
    navigate(`/tasks/`);
    navigate(`/tasks/${taskId}/chat`);
  };

  if (!sidebarOpen) {
    return (
      <div className="p-3">
        <ListTodo className="h-6 w-6 text-gray-600 dark:text-gray-300" />
      </div>
    );
  }

  const sortedTasks = [...tasks].sort((a, b) => {
    const order = { "To Do": 1, "In Progress": 2, Done: 3 };
    return (order[a.status] || 4) - (order[b.status] || 4);
  });

  // 🔹 Filter tasks where current user is a member
  const filteredTasks = sortedTasks.filter((task) =>
    task.members.includes(username)
  );

  return (
    <div className="px-3 space-y-2 mt-4">
      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider pl-3">
        My Tasks
      </h3>

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
                <Button
                  variant="ghost"
                  onClick={() => handleToggle(task.id)}
                  className={`w-full h-auto px-3 py-2 justify-start transition-colors ${
                    expandedTaskId === task.id
                      ? "bg-gray-100 dark:bg-gray-700"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-2 truncate">
                      {expandedTaskId === task.id ? (
                        <ChevronDown className="h-4 w-4 flex-shrink-0 text-primary" />
                      ) : (
                        <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                      )}
                      <span className="text-sm font-medium truncate">
                        {task.title}
                      </span>

                      {/* 🎯 DISPLAY UNREAD BUBBLE in Sidebar */}
                      {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center p-0.5 ml-1 flex-shrink-0 animate-pulse">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}

                    </div>
                    <span
                      className={`text-xs font-semibold rounded-full px-2 py-0.5 ml-2 flex-shrink-0 ${
                        statusColors[task.status] || statusColors.default
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                </Button>

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