// src/services/taskService.ts
export interface TaskDTO {
  id: number;
  title: string;
  project: string;
  projectId: number; 
  owner: string;
  members: string[];
  description: string;
  dueDate: string;
  status: string;
}

const API_URL = "http://localhost:5000"; // your backend URL

export const getTasks = async (): Promise<TaskDTO[]> => {
  const res = await fetch(`${API_URL}/tasks`, {
    cache: "no-store", 
  });
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
};

export const createTask = async (task: Partial<TaskDTO>) => {
  const res = await fetch(`${API_URL}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error("Failed to create task");
  return res.json();
};

export const updateTask = async (id: number, task: Partial<TaskDTO>) => {
  const res = await fetch(`${API_URL}/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error("Failed to update task");
  return res.json();
};

export const deleteTask = async (id: number) => {
  const res = await fetch(`${API_URL}/tasks/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete task");
  return res.json();
};
