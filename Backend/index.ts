// index.ts
import express from "express";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors({ origin: true })); // allow all origins in dev; tighten in prod
app.use(express.json());

const prisma = new PrismaClient();

// Health
app.get("/", (_req, res) => res.send({ status: "ok", message: "Task Manager API" }));

/**
 * Categories
 */
// Get all categories with tasks
app.get("/categories", async (req, res) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { id: "asc" } });
    res.json(categories); // must be an array!
  } catch (err) {
    console.error("GET /categories error", err);
    res.status(500).json([]); // fallback to empty array instead of crashing
  }
});


// Get single category
app.get("/categories/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const cat = await prisma.category.findUnique({
      where: { id },
      include: { tasks: true },
    });
    if (!cat) return res.status(404).json({ error: "Category not found" });
    res.json(cat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch category" });
  }
});

// Create category
app.post("/categories", async (req, res) => {
  const { name } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ error: "Name is required" });

  try {
    const created = await prisma.category.create({ data: { name: String(name).trim() } });
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create category" });
  }
});

// Update category
app.put("/categories/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ error: "Name is required" });

  try {
    const updated = await prisma.category.update({
      where: { id },
      data: { name: String(name).trim() },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update category" });
  }
});

// Delete category (cascade deletes tasks because schema has onDelete: Cascade)
app.delete("/categories/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.category.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

/**
 * Tasks
 */
// Get tasks (optional ?categoryId=)
app.get("/tasks", async (req, res) => {
  try {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const tasks = await prisma.task.findMany({
      where: categoryId ? { category_id: categoryId } : {},
      include: { category: true },
      orderBy: { id: "asc" },
    });
    res.json(tasks);
  } catch (err) {
    console.error("GET /tasks error", err);
    res.status(500).json([]); // fallback to empty array
  }
});


// Get single task
app.get("/tasks/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const task = await prisma.task.findUnique({ where: { id }, include: { category: true } });
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

// Create task
app.post("/tasks", async (req, res) => {
  const { title, description, due_date, status, category_id } = req.body;
  if (!title || !String(title).trim()) return res.status(400).json({ error: "Title is required" });
  if (!category_id) return res.status(400).json({ error: "category_id is required" });

  try {
    const created = await prisma.task.create({
      data: {
        title: String(title).trim(),
        description: description ?? null,
        due_date: due_date ? new Date(due_date) : null,
        status: status === "completed" ? "completed" : "pending",
        category: { connect: { id: Number(category_id) } },
      },
    });
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// Update task (all fields)
app.put("/tasks/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { title, description, due_date, status, category_id } = req.body;

  if (!title || !String(title).trim()) return res.status(400).json({ error: "Title is required" });
  if (!category_id) return res.status(400).json({ error: "category_id is required" });

  try {
    const updated = await prisma.task.update({
      where: { id },
      data: {
        title: String(title).trim(),
        description: description ?? null,
        due_date: due_date ? new Date(due_date) : null,
        status: status === "completed" ? "completed" : "pending",
        category: { connect: { id: Number(category_id) } },
      },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// Partial update: update status only
app.patch("/tasks/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!["pending", "completed"].includes(status)) return res.status(400).json({ error: "Invalid status" });

  try {
    const updated = await prisma.task.update({
      where: { id },
      data: { status },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update task status" });
  }
});

// Delete task
app.delete("/tasks/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.task.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// Graceful shutdown
const PORT = Number(process.env.PORT || 3000);
const server = app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));

process.on("SIGINT", async () => {
  console.log("SIGINT: disconnecting prisma...");
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});
