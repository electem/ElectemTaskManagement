// src/services/taskService.ts
import api from "@/lib/api"; // Axios instance with interceptor

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

export const getTasks = async (): Promise<TaskDTO[]> => {
  try {
    const res = await api.get("/tasks");
    return res.data;
  } catch (err) {
    throw new Error("Failed to fetch tasks");
  }
};

export const createTask = async (task: Partial<TaskDTO>) => {
  try {
    const res = await api.post("/tasks", task);
    return res.data;
  } catch (err) {
    throw new Error("Failed to create task");
  }
};

export const updateTask = async (id: number, task: Partial<TaskDTO>) => {
  try {
    const res = await api.put(`/tasks/${id}`, task);
    return res.data;
  } catch (err) {
    throw new Error("Failed to update task");
  }
};

export const deleteTask = async (id: number) => {
  try {
    const res = await api.delete(`/tasks/${id}`);
    return res.data;
  } catch (err) {
    throw new Error("Failed to delete task");
  }
};
