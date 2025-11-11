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
import { searchTasks, TaskDTO } from "@/services/taskService";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { useConversationContext } from "@/context/ConversationProvider";
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
interface ConversationMessage {
  content?: string;
  text?: string;
  createdAt?: string;
  timestamp?: string; // <-- add this
}

interface BulkMessage {
  taskId: number;
  updatedAt: string;
  conversation?: ConversationMessage[];
}



const TaskGridView = () => {
  const navigate = useNavigate();
  const { tasks: ctxTasks, fetchTasks: fetchCtxTasks, unreadCounts, markTaskAsRead } = useTaskContext();  
  const { projects, fetchProjects } = useProjectContext();

const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Record<number, string[]>>({});

  const [projectFilter, setProjectFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bulkMessages, setBulkMessages] = useState<BulkMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const username = localStorage.getItem("username");

useEffect(() => {
  const loadFilteredTasks = async () => {
    setLoading(true);
    try {
      await fetchCtxTasks({
        project: projectFilter,
        owner: ownerFilter,
        status: statusFilter,
      });
    } catch (err) {
      console.error("Error fetching filtered tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  loadFilteredTasks();
}, [projectFilter, ownerFilter, statusFilter]);




useEffect(() => {
  const delay = setTimeout(async () => {
    if (!searchQuery.trim()) {
      //  Use tasks from TaskContext directly (no re-fetch)
      setTasks(Array.isArray(ctxTasks) ? ctxTasks : []);
      return;
    }

    //  If searching, fetch filtered tasks
    const results = await searchTasks(searchQuery);
    setTasks(results);
  }, 400);

  return () => clearTimeout(delay);
}, [searchQuery, ctxTasks]);


  // ✅ Fetch last 2 messages per task
 useEffect(() => {
  const fetchMessages = async () => {
    if (tasks.length === 0) return;

    try {
      const taskIds = tasks.map((t) => t.id);
      const res = await api.post("/messages/allMessages", { taskIds });
      const data = res.data || [];
      setBulkMessages(data);
      const results: Record<number, string[]> = {};
      const messageTimes: Record<number, number> = {};

      data.forEach((msg: BulkMessage) => {

        const convo = msg.conversation || [];

        // take last 2 messages from conversation
        const lastTwo = convo.slice(-2).map((m: string | ConversationMessage) => {
          const raw = typeof m === "string" ? m : m?.content || m?.text || "";

          // ✅ Extract sender, timestamp, and message text cleanly
          const match = raw.match(
            /^(\w+)\((\d{2}\/\d{2}\s+\d{2}:\d{2}(?::\d{2})?)\):\s*(.*)$/
          );

          let sender = "";
          let time = "";
          let text = raw;

          if (match) {
            sender = match[1];
            time = match[2];
            text = match[3]; // remove prefix from message text
          }

          // ✅ Handle image or video previews
          if (/<img\s+[^>]*src=["'][^"']+["'][^>]*>/i.test(text)) {
            text = "📷 Image";
          } else if (
            /<video\s+[^>]*src=["'][^"']+["'][^>]*>/i.test(text) ||
            /\.(mp4|mov|avi|mkv|webm)/i.test(text)
          ) {
            text = "🎬 Video";
          } else {
            // clean text & limit length
            text = text.replace(/<[^>]*>/g, "").trim();
            if (text.length > 200) text = text.slice(0, 200) + "...";
          }

          // ✅ Format sender in navy blue and bold
          const formatted = `<span class="text-blue-800 font-semibold">${sender}</span> (${time}): ${text}`;


          return formatted;
        });

        results[msg.taskId] = lastTwo;

        // record message time for sorting
        if (convo.length > 0) {
          const lastMsg = convo[convo.length - 1];
          const lastTime = new Date(
            lastMsg.createdAt || lastMsg.timestamp || msg.updatedAt || Date.now()
          ).getTime();
          messageTimes[msg.taskId] = lastTime;
        } else {
          messageTimes[msg.taskId] = 0;
        }
      });

      setMessages(results);
    } catch (error) {
      console.error("Error fetching bulk messages:", error);
    }
  };

  fetchMessages();
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
  .sort((a, b) => {
    const getLastUpdated = (taskId: number) => {
      const record = bulkMessages.find((m) => m.taskId === taskId);
      return record ? new Date(record.updatedAt).getTime() : 0;
    };

    return getLastUpdated(b.id) - getLastUpdated(a.id);
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
                      dangerouslySetInnerHTML={{
                        __html: `${i === 0 ? "💬 " : "🗨️ "} ${msg}`,
                      }}
                    />
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
 