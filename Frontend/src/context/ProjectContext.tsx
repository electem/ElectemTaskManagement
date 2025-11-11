import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";
import api from "@/lib/api"; // Axios instance with interceptor


export interface Task {
  id: number;
  title: string;
  description?: string;
  status?: string;
  dueDate?: string;
  owner?: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  owner?: string;
  tasks?: Task[];
}

interface ProjectContextType {
  projects: Project[];
  fetchProjects: () => Promise<void>;
  
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
