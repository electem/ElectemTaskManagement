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

// Ensure this matches your TaskDTO or Task interface structure
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

// Helper function to format the date
const formatDate = (dateString: string) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    return dateString;
  }
};

// Helper function to truncate text
const truncateText = (text: string, maxLength: number) => {
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + "...";
  }
  return text;
};


const TaskManagement = () => {
  const navigate = useNavigate();
  const { tasks: contextTasks, closeTask } = useTaskContext();

  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fetchedTasks, setFetchedTasks] = useState<TaskDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const { projects, fetchProjects } = useProjectContext();

  // FIX: handleCloseTask now explicitly accepts a string (task.id)
  const handleCloseTask = async (taskId: string) => {
    try {
      // Convert the string ID back to number for the deleteTask API call
      const idAsNumber = Number(taskId);
      if (isNaN(idAsNumber)) {
        throw new Error("Invalid Task ID");
      }
      // Note: If your deleteTask service truly needs a number, this conversion is necessary.
      await deleteTask(idAsNumber); 
      setFetchedTasks(fetchedTasks.filter((t) => t.id.toString() !== taskId));
      toast.success("Task closed successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to close task");
    }
  };

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const data = await getTasks();
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
    // Note: The logic below seems to be designed to exclude 'Completed' tasks unless the filter is explicitly set to 'Completed'
    if (statusFilter !== "Completed" && task.status === "Completed")
      return false;
    if (projectFilter !== "all" && task.project !== projectFilter) return false;
    if (ownerFilter !== "all" && task.owner !== ownerFilter) return false;
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
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

  const handleChatClick = (taskId: string) => {
    navigate(`/tasks/${taskId}/chat`);
  };

  const handleTitleClick = (taskId: string) => {
    navigate(`/tasks/${taskId}/edit`);
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
                  {/* Title column: Clickable for Edit */}
                  <TableHead>Title</TableHead>
                  {/* Replaced 'Project' with 'Description' */}
                  <TableHead>Description</TableHead>
                  <TableHead>Owner</TableHead>
                  {/* Due Date column: Formatted date */}
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  {/* New 'Message' column: Clickable for Chat */}
                  <TableHead>Message</TableHead>
                  {/* 'Members' and 'Actions' columns are removed */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => (
                  <TableRow key={task.id}>
                    {/* Title cell - now clickable for edit */}
                    <TableCell
                      className="font-medium cursor-pointer hover:underline text-primary"
                      onClick={() => handleTitleClick(task.id.toString())}
                      title="Click to Edit Task"
                    >
                      {task.title}
                    </TableCell>
                    {/* Description cell - truncated to 20 characters */}
                    <TableCell title={task.description}>
                      {truncateText(task.description, 20)}
                    </TableCell>
                    <TableCell>{task.owner}</TableCell>
                    {/* Due Date cell - now formatted */}
                    <TableCell>{formatDate(task.dueDate)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(task.status)}>
                        {task.status}
                      </Badge>
                    </TableCell>
                    {/* New Message cell - clickable for chat */}
                    <TableCell
                      className="cursor-pointer hover:text-primary hover:underline flex items-center gap-1"
                      onClick={() => handleChatClick(task.id.toString())}
                      title="Click to view chat"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Latest Message...
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