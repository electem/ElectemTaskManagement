import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTaskContext } from "@/context/TaskContext";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useProjectContext } from "@/context/ProjectContext";
import { useUsers } from "@/hooks/useUsers";
import { useTaskHistory } from "@/context/TaskHistoryContext";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface Task {
  id: number;
  projectId: number;
  project: string;
  owner: string;
  members: string[];
  title: string;
  description?: string;
  dueDate?: string;
  status: string;
  url?: string;
  dependentTaskId: number[]; // ✅ array, matches Prisma
}

const statusOptions = [
  "Pending",
  "Partially Clear",
  "In Progress",
  "Completed",
  "On Hold",
  "Cancelled",
   "Paused",
   "Bug",
  "Draft",
  // "Submitted",
  "Reviewed",
  "Tested",
  // "Approved",
  //"Rejected",
  "Needs Validation",
  // "Reviewed by Client",
  "Reviewed by Vinod",
  // "Waiting for Client Approval",
  // "Approved by Client",
  "Changes Requested",
 
  //  "Open",
  // "Assigned",
  // "In Review",
  // "QA Testing",
  // "Resolved",
];

const TaskForm = () => {
  const navigate = useNavigate();
  const { taskId } = useParams();

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Pending: "bg-yellow-500",
      "In Progress": "bg-blue-500",
      "Partially Clear": "bg-gray-600",
      Completed: "bg-green-500",
      "On Hold": "bg-orange-500",
      Cancelled: "bg-red-500",
      Draft: "bg-cyan-500",
      // Submitted: "bg-cyan-500",
      Reviewed: "bg-indigo-500",
      Tested: "bg-green-600",
      // Rejected: "bg-red-600",
      "Needs Validation": "bg-orange-400",
      // "Reviewed by Client": "bg-purple-500",
      "Reviewed by Vinod": "bg-teal-500",
      // "Waiting for Client Approval": "bg-yellow-600",
      // "Approved by Client": "bg-green-700",
      "Changes Requested": "bg-amber-500",
       Paused: "bg-lime-500",
       Bug:"bg-emerald-600"
      // Open: "bg-sky-500",
      // Assigned: "bg-lime-500",
      // "In Review": "bg-indigo-400",
      // "QA Testing": "bg-blue-600",
      // Resolved: "bg-emerald-600",
    };

    return colors[status] || "bg-muted";
  };
  const numericTaskId = taskId ? Number(taskId) : null;
  const isEditMode = !!taskId;
  const { projects } = useProjectContext();
  const { tasks, addTask, updateTask, fetchTasks } = useTaskContext();
  const { users, loading: usersLoading } = useUsers();
  const { logTaskHistory } = useTaskHistory();

  const [formData, setFormData] = useState({
    project: "",
    projectId: "",
    owner: "",
    members: ["Vin"],
    title: "",
    description: "",
    dueDate: new Date().toISOString().split("T")[0],
    status: "Pending",
    url: "",
    dependentTaskId: [] as string[],
  });

  useEffect(() => {
    const loadTask = async () => {
      if (!isEditMode || !taskId) return;
   
      //  If no tasks are loaded yet, fetch them first
      if (tasks.length === 0) {
        await fetchTasks();
        return;
      }
   
      //  Once tasks are loaded, find the matching one
      const task = tasks.find((t) => t.id === Number(taskId));
   
      if (task) {
        setFormData({
          project: task.project || "",
          projectId: task.projectId?.toString() || "",
          owner: task.owner || "",
          members: task.members || [],
          title: task.title,
          description: task.description || "",
          dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
          status: task.status,
          url: task.url || "",
          dependentTaskId: Array.isArray(task.dependentTaskId)
            ? task.dependentTaskId.map((id) => id.toString())
            : [],
        });
      }
    };
   
    loadTask();
  }, [isEditMode, taskId, tasks, fetchTasks]);

 if (isEditMode && tasks.length === 0) {
      return <div className="p-8">Loading task details...</div>;
    }

  const handleSubmit = async () => {
    if (!formData.project || !formData.title || !formData.owner) {
      toast.error("Please fill in all required fields");
      return;
    }
      const titleRegex = /^[a-zA-Z0-9\s\-_&()*{}\[\]'"']+$/;

    if (!titleRegex.test(formData.title)) {
      toast.error(
        "Title should not include special characters other than - _ & ( ) * { } [ ] ' \""
      );
      return;
    }

    const taskData = {
      projectId: Number(formData.projectId),
      project: formData.project,
      owner: formData.owner,
      members: formData.members,
      title: formData.title,
      description: formData.description,
      dueDate: formData.dueDate,
      status: formData.status,
      url: formData.url,
      dependentTaskId: Array.isArray(formData.dependentTaskId)
        ? formData.dependentTaskId.map((id) => Number(id))
        : [],
    };

    if (isEditMode && numericTaskId) {
      const oldTask = tasks.find((t) => t.id === numericTaskId);
      updateTask(numericTaskId, taskData);
      toast.success("Task updated successfully!");

      // ✅ Log history only if status, dueDate, or owner changed
      if (oldTask) {
        await logTaskHistory(numericTaskId, oldTask, taskData);
      }
    } else {
      addTask(taskData);
      toast.success("Task created successfully!");
    }

    navigate("/tasks");
  };

  return (
    <div className="p-8">
      <Button
        variant="ghost"
        onClick={() => navigate("/tasks")}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Tasks
      </Button>

      <Card className="shadow-md max-w-3xl">
        <CardHeader>
          <CardTitle>{isEditMode ? "Edit Task" : "Create New Task"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* New Row 1: Project and URL */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Select Project *</Label>
                <Select
                  value={formData.projectId} // store id here
                  onValueChange={(value) => {
                    const selectedProject = projects.find(
                      (p) => p.id === Number(value)
                    );
                    if (selectedProject) {
                      setFormData({
                        ...formData,
                        projectId: selectedProject.id.toString(),
                        project: selectedProject.name,
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem
                        key={project.id}
                        value={project.id.toString()}
                      >
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* New URL Input Field */}
              <div className="space-y-2">
                <Label htmlFor="url">Enter URL</Label>
                <Input
                  id="url"
                  placeholder="Enter URL"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                />
              </div>
            </div>

            {/* New Row 2: Owner and Members */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Select Owner *</Label>
                <Select
                  value={formData.owner}
                  onValueChange={(value) =>
                    setFormData({ ...formData, owner: value })
                  }
                  disabled={usersLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {(users || []).map((user) => (
                      <SelectItem key={user.id} value={user.username}>
                        {user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Select Members</Label>
                <Select
                  value="" // Keep value empty for selecting new member
                  onValueChange={(value) => {
                    if (!formData.members.includes(value)) {
                      setFormData({
                        ...formData,
                        members: [...formData.members, value],
                      });
                    }
                  }}
                  disabled={usersLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose team members" />
                  </SelectTrigger>
                  <SelectContent>
                    {(users || []).map((user) => (
                      <SelectItem key={user.id} value={user.username}>
                        {user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.members.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.members.map((member, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer"
                      >
                        {member}

                        {member.toLowerCase() !== "vin" && (
                          <button
                            onClick={() =>
                              setFormData({
                                ...formData,
                                members: formData.members.filter(
                                  (m) => m !== member
                                ),
                              })
                            }
                            className="ml-2"
                          >
                            &times;
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* New Row 4: Status and Due Date (Same as old Row 3) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                />
              </div>
            </div>
            {/* New Row 3: Title (Full Width) */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Enter task title"
              />
            </div>

            {/* New Row 5: Description (Full Width) - Changed Textarea rows to 1 as requested ("single line") */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter task description"
                rows={1} // Changed from rows={4} to rows={1} for "single line"
              />
            </div>

            {/* New Row 6: Dependant Task (Full Width) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dependent Task</Label>
                <Select
                  value="" // keep empty for selecting new dependent task
                  onValueChange={(value) => {
                    if (!formData.dependentTaskId.includes(value)) {
                      setFormData({
                        ...formData,
                        dependentTaskId: [...formData.dependentTaskId, value],
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select dependent tasks" />
                  </SelectTrigger>
                  <SelectContent>
                    {tasks
                      .filter((t) => t.id !== (taskId ? Number(taskId) : null))
                      .map((task) => (
                        <SelectItem key={task.id} value={task.id.toString()}>
                          {task.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {/* Show selected dependent tasks */}
                {formData.dependentTaskId.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.dependentTaskId.map((depId, index) => {
                      const depTask = tasks.find((t) => t.id === Number(depId));
                      return (
                        <Badge
                          key={index}
                          className={`cursor-pointer ${
                            depTask
                              ? getStatusColor(depTask.status)
                              : "bg-muted"
                          }`}
                        >
                          {depTask?.title || depId}
                          <button
                            onClick={() =>
                              setFormData({
                                ...formData,
                                dependentTaskId:
                                  formData.dependentTaskId.filter(
                                    (id) => id !== depId
                                  ),
                              })
                            }
                            className="ml-2"
                          >
                            &times;
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleSubmit} className="flex-1">
                {isEditMode ? "Update Task" : "Create Task"}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/tasks")}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskForm;
