import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTaskContext } from "@/context/TaskContext";
import { useProjectContext } from "@/context/ProjectContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageCircle, Search } from "lucide-react";
import { getTasks, searchTasks, TaskDTO } from "@/services/taskService";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
export interface Task {
  id: number;
  title: string;
  description: string;
  owner?: string;
  members: string[];
  project?: string;
  dueDate?: string;
  status: string;
}

const TaskGridView = () => {
  const navigate = useNavigate();
  const { unreadCounts, markTaskAsRead } = useTaskContext();
  const { projects, fetchProjects } = useProjectContext();

  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Record<number, string[]>>({});

  const [projectFilter, setProjectFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const username = localStorage.getItem("username");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getTasks();
        setTasks(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
    fetchProjects();
  }, []);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (!searchQuery.trim()) {
        const data = await getTasks();
        setTasks(data);
        return;
      }
      const results = await searchTasks(searchQuery);
      setTasks(results);
    }, 400);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  // ✅ Fetch last 2 messages per task
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const results: Record<number, string[]> = {};
        const messageTimes: Record<number, number> = {};

        await Promise.all(
          tasks.map(async (task) => {
            const res = await api.get(`/messages`, {
              params: { taskId: task.id },
            });
            const convo = res.data || [];

            // record message time for sorting later
            if (convo.length > 0) {
              const lastMsg = convo[convo.length - 1];
              const lastTime = new Date(
                lastMsg.createdAt || lastMsg.timestamp || Date.now()
              ).getTime();
              messageTimes[task.id] = lastTime;
            } else {
              messageTimes[task.id] = 0;
            }

            const lastTwo = convo.slice(-2).map((m: any) => {
              const raw =
                typeof m === "string" ? m : m?.content || m?.text || "";

              // extract sender name before first colon (like "SUR(01/11 15:55):")
              const senderMatch = raw.match(/^([^:]+:)/);
              const senderPrefix = senderMatch ? senderMatch[1] + " " : "";

              if (/<img\s+[^>]*src=["'][^"']+["'][^>]*>/i.test(raw)) {
                return `${senderPrefix}📷 Image`;
              }

              if (
                /<video\s+[^>]*src=["'][^"']+["'][^>]*>/i.test(raw) ||
                /\.(mp4|mov|avi|mkv|webm)/i.test(raw)
              ) {
                return `${senderPrefix}🎬 Video`;
              }

              const cleanText = raw.replace(/<[^>]*>/g, "").trim();
              const shortText =
                cleanText.length > 200
                  ? cleanText.slice(0, 200) + "..."
                  : cleanText;

              return `${senderPrefix}${shortText}`;
            });

            results[task.id] = lastTwo;
          })
        );

        setMessages(results);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    if (tasks.length > 0) fetchMessages();
  }, [tasks]);

  const owners = Array.from(new Set(tasks.map((t) => t.owner)));

  const filteredTasks = tasks.filter((task) => {
    const isSearching = searchQuery.trim().length > 0;
    if (!isSearching) {
      if (
        (statusFilter !== "Completed" && task.status === "Completed") ||
        (statusFilter !== "Cancelled" && task.status === "Cancelled")
      ) {
        return false;
      }
    }
    if (projectFilter !== "INTERNAL" && task.project === "INTERNAL")
      return false;
    if (projectFilter !== "all" && task.project !== projectFilter) return false;
    if (ownerFilter !== "all" && task.owner !== ownerFilter) return false;
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    const isOwner = task.owner === username;
    const isMember = task.members.includes(username);
    if (!isOwner && !isMember) return false;
    return true;
  });

  const handleChatClick = (id: string, title: string, desc?: string) => {
    markTaskAsRead(id);
    if (desc) localStorage.setItem("taskDescription", desc);
    navigate(`/tasks/${id}/${title}/chat`);
  };

  const handleEditClick = (id: string) => {
    navigate(`/tasks/${id}/edit`);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-full">
        Loading tasks...
      </div>
    );

  return (
    <div className="h-full flex flex-col p-4">
      {/* Filters */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="relative w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 w-[280px]"
            />
          </div>

          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.name}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Owners" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              {owners.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="all">All Status</SelectItem>
              {[
                "Pending",
                "In Progress",
                "Completed",
                "Paused",
                "Cancelled",
                "Reviewed",
                "Draft",
              ].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 overflow-y-auto pb-6">
        {filteredTasks
          .filter((task) => messages[task.id] && messages[task.id].length > 0)
          // ✅ Sort by last message time (latest first)
          .sort((a, b) => {
            const extractTime = (msg: string) => {
              // Match SUR(06/11 10:29:45) or SUR(06/11 10:29)
              const match = msg.match(
                /\((\d{2})\/(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?\)/
              );
              if (!match) return 0;
              const [, day, month, hour, minute, second] = match.map(Number);
              const year = new Date().getFullYear();
              return new Date(
                year,
                month - 1,
                day,
                hour,
                minute,
                second || 0
              ).getTime();
            };

            const getLatestTime = (taskId: number) => {
              const msgs = messages[taskId];
              if (!msgs || msgs.length === 0) return 0;

              // Check all messages for latest timestamp
              return Math.max(...msgs.map((msg) => extractTime(msg)));
            };

            return getLatestTime(b.id) - getLatestTime(a.id);
          })

          .map((task) => {
            const unread = unreadCounts[task.id.toString()] || 0;
            const taskMessages = messages[task.id] || [];

            return (
              <div
                key={task.id}
                className="border border-gray-300 shadow-sm bg-white p-4 pl-6 rounded-xl relative hover:shadow-lg transition-all duration-200 cursor-pointer min-h-[180px] flex flex-col"
                onClick={() =>
                  handleChatClick(
                    task.id.toString(),
                    task.title,
                    task.description
                  )
                }
              >
                {/* Header */}
                <div
                  className="flex justify-between items-center border-b border-gray-200 pb-2 mb-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2">
                    <h3
                      className="font-semibold text-blue-700 text-sm max-w-[240px] truncate hover:underline cursor-pointer"
                      title={task.title}
                      onClick={() => handleEditClick(task.id.toString())}
                    >
                      {task.title.length > 80
                        ? `${task.title.slice(0, 80)}...`
                        : task.title}
                    </h3>
                    <MessageCircle
                      className="h-4 w-4 text-gray-600 hover:text-blue-600 transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChatClick(
                          task.id.toString(),
                          task.title,
                          task.description
                        );
                      }}
                    />
                  </div>
                  {unread > 0 && (
                    <Badge
                      variant="destructive"
                      className="h-5 w-5 flex items-center justify-center text-[10px] rounded-full animate-pulse"
                    >
                      {unread > 9 ? "9+" : unread}
                    </Badge>
                  )}
                </div>

                {/* ✅ Show last 2 messages */}
                <div className="flex flex-col flex-grow text-sm text-gray-700 mt-1 leading-tight">
                  {taskMessages.map((msg, i) => (
                    <p
                      key={i}
                      className="whitespace-pre-line break-words w-full text-gray-700"
                    >
                      {i === 0 ? "💬 " : "🗨️ "} {msg}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default TaskGridView;
 