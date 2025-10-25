import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTaskContext } from "@/context/TaskContext";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit2, X, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { TaskDTO, getTasks, deleteTask } from "@/services/taskService";
import { useProjectContext } from "@/context/ProjectContext";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
}

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

const statusOptions = [
  "Pending",
  "In Progress",
  "Closed",
  "Completed",
  "On Hold",
  "Cancelled",
  "Draft",
  "Submitted",
  "Reviewed",
  "Approved",
  "Rejected",
  "Needs Revision",
  "Reviewed by Client",
  "Reviewed by Vinod",
  "Waiting for Client Approval",
  "Approved by Client",
  "Changes Requested",
  "Open",
  "Assigned",
  "In Review",
  "QA Testing",
  "Resolved",
];

const TaskManagement = () => {
  const navigate = useNavigate();
  const { tasks: contextTasks, closeTask } = useTaskContext();

  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fetchedTasks, setFetchedTasks] = useState<TaskDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const { projects, fetchProjects } = useProjectContext();
  const username = localStorage.getItem("username");
  const handleCloseTask = async (taskId: number) => {
    try {
      await deleteTask(taskId); // API expects number
      setFetchedTasks(fetchedTasks.filter((t) => t.id !== taskId));
      toast.success("Task closed successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to close task");
    }
  };

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const data = await getTasks(); // your API call
        setFetchedTasks(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  useEffect(() => {
    fetchProjects();
  }, []);

  // Get unique owners dynamically from fetched tasks
  const owners = Array.from(new Set(fetchedTasks.map((task) => task.owner)));

  // Filter tasks
  const filteredTasks = fetchedTasks.filter((task) => {
    if (statusFilter !== "Completed" && task.status === "Completed")
      return false;
    if (projectFilter !== "all" && task.project !== projectFilter) return false;
    if (ownerFilter !== "all" && task.owner !== ownerFilter) return false;
    if (statusFilter !== "all" && task.status !== statusFilter) return false;

    // 🔹 Only show if username exists in task.members
    if (!task.members.includes(username)) return false;

    return true;
  });

  if (loading)
    return (
      <div className="flex items-center justify-center h-full">
        Loading tasks...
      </div>
    );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Completed: "bg-green-500",
      "In Progress": "bg-primary",
      Pending: "bg-yellow-500",
      "On Hold": "bg-orange-500",
      Cancelled: "bg-red-500",
      Approved: "bg-green-600",
      Rejected: "bg-red-600",
    };
    return colors[status] || "bg-muted";
  };

  return (
    <div className="h-full flex flex-col">
      <Card className="m-4 shadow-md flex-1 flex flex-col">
        <CardContent className="p-4 flex-1 flex flex-col">
          {/* Header with filters and create button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">All Tasks</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/tasks/new")}
                className="h-8 w-8"
                title="Create Task"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-3">
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.name}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Owners" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Owners</SelectItem>
                  {owners.map((owner) => (
                    <SelectItem key={owner} value={owner}>
                      {owner}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">All Status</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Task table with scrollable area */}
          <div className="rounded-lg border flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>{task.project}</TableCell>
                    <TableCell>{task.owner}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {task.members.slice(0, 2).map((member, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs"
                          >
                            {member}
                          </Badge>
                        ))}
                        {task.members.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{task.members.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{task.dueDate}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(task.status)}>
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/tasks/${task.id}/chat`)}
                          className="hover:bg-primary/10"
                          title="Chat"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/tasks/${task.id}/edit`)}
                          className="hover:bg-primary/10"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCloseTask(task.id)}
                          className="hover:bg-destructive/10 hover:text-destructive"
                          title="Close"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskManagement;
