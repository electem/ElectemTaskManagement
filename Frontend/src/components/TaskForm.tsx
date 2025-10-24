import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTaskContext } from "@/context/TaskContext";
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
  "Closed",
  "In Progress",
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

const TaskForm = () => {
  const navigate = useNavigate();
  const { taskId } = useParams();
  const numericTaskId = taskId ? Number(taskId) : null;
  const isEditMode = !!taskId;
  const { projects, addProject } = useProjectContext();
  const { tasks, addTask, updateTask } = useTaskContext();
  const { users, loading: usersLoading } = useUsers();

  const [formData, setFormData] = useState({
    project: "",
    projectId: "",
    owner: "",
    members: [] as string[],
    title: "",
    description: "",
    dueDate: "",
    status: "Pending",
  });

  useEffect(() => {
    if (isEditMode && taskId) {
      const task = tasks.find((t) => t.id === Number(taskId));

      if (task) {
        setFormData({
          project: task.project || "", // fallback if optional
          projectId: task.projectId?.toString() || "",
          owner: task.owner || "",
          members: task.members || [],
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          status: task.status,
        });
      }
    }
  }, [isEditMode, taskId, tasks]);

  const handleSubmit = () => {
    if (!formData.project || !formData.title || !formData.owner) {
      toast.error("Please fill in all required fields");
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
    };

    if (isEditMode && numericTaskId) {
      updateTask(numericTaskId, taskData);
      toast.success("Task updated successfully!");
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
            {/* Row 1: Project and Owner */}
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
            </div>

            {/* Row 2: Members and Title */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Select Members</Label>
                <Select
                  value=""
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
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

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
            </div>

            {/* Row 3: Status and Due Date */}
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

            {/* Description - Full Width */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter task description"
                rows={4}
              />
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
