import { Request, Response } from "express";
import prisma from "../prisma/client";

// Get all projects
export const getProjects = async (req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      include: { tasks: true },
    });
    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
};

// Create new project
export const createProject = async (req: Request, res: Response) => {
  try {
    const { name,description } = req.body;
    const project = await prisma.project.create({ data: { name,description } });
    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create project" });
  }
};

// Update project
export const updateProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name,description } = req.body;
    const project = await prisma.project.update({
      where: { id: Number(id) },
      data: { name },
    });
    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update project" });
  }
};

// Delete project
export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.task.deleteMany({ where: { projectId: Number(id) } }); // delete tasks first
    await prisma.project.delete({ where: { id: Number(id) } });
    res.json({ message: "Project deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete project" });
  }
};