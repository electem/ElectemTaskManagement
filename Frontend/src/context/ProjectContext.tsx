import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";
import api from "@/lib/api"; // Axios instance with interceptor

export interface Project {
  id: number;
  name: string;
  description?: string;
  owner?: string;
  tasks?: any[];
}

interface ProjectContextType {
  projects: Project[];
  fetchProjects: () => Promise<void>;
  addProject: (project: Omit<Project, "id">) => Promise<void>;
  updateProject: (id: number, project: Partial<Project>) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>([]);

  // Fetch all projects
  const fetchProjects = async () => {
    try {
      const res = await api.get("/projects");
      setProjects(res.data);
    } catch (err) {
      console.error("Error fetching projects:", err);
      toast.error("Failed to fetch projects");
    }
  };

  // Add new project
  const addProject = async (project: Omit<Project, "id">) => {
    try {
      const res = await api.post("/projects", project);
      setProjects((prev) => [res.data, ...prev]);
      toast.success("Project created successfully!");
    } catch (err) {
      console.error("Error adding project:", err);
      toast.error("Failed to create project");
    }
  };

  // Update a project
  const updateProject = async (id: number, project: Partial<Project>) => {
    try {
      const res = await api.put(`/projects/${id}`, project);
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? res.data : p))
      );
      toast.success("Project updated successfully!");
    } catch (err) {
      console.error("Error updating project:", err);
      toast.error("Failed to update project");
    }
  };

  // Delete a project
  const deleteProject = async (id: number) => {
    try {
      await api.delete(`/projects/${id}`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success("Project deleted successfully!");
    } catch (err) {
      console.error("Error deleting project:", err);
      toast.error("Failed to delete project");
    }
  };

  // Load projects initially
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) fetchProjects();
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        fetchProjects,
        addProject,
        updateProject,
        deleteProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjectContext must be used within a ProjectProvider");
  }
  return context;
};
