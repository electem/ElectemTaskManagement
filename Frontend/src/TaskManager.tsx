import React, { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
// import "./TaskManager.css";

const API_BASE = "http://localhost:3000";

interface Category {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

type TaskStatus = "pending" | "completed";

interface Task {
  id: number;
  category_id: number;
  title: string;
  description?: string | null;
  due_date?: string | null;
  status: TaskStatus;
  category?: Category | null;
  created_at?: string;
  updated_at?: string;
}

const emptyCategory = { id: 0, name: "" };
const emptyTask = {
  id: 0,
  category_id: 0,
  title: "",
  description: "",
  due_date: "",
  status: "pending" as TaskStatus,
};

const TaskManager: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const [categoryForm, setCategoryForm] = useState<Category>(emptyCategory);
  const [taskForm, setTaskForm] = useState<Task>(emptyTask);

  // load categories and tasks
  useEffect(() => {
    fetchCategories();
    fetchTasks();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/categories`);
      const data: Category[] = await res.json();
      setCategories(data);
    } catch (err) {
      console.error("fetchCategories error", err);
      // alert("Failed to load categories");
    }
  };

  const fetchTasks = async (categoryId?: number) => {
    try {
      const url = categoryId ? `${API_BASE}/tasks?categoryId=${categoryId}` : `${API_BASE}/tasks`;
      const res = await fetch(url);
      const data: Task[] = await res.json();
      setTasks(
        // normalize server keys (due_date -> dueDate for UI convenience)
        data.map((t) => ({
          ...t,
          // leave due_date as string in YYYY-MM-DD if available
          due_date: t.due_date ? new Date(t.due_date).toISOString().slice(0, 10) : "",
        }))
      );
    } catch (err) {
      console.error("fetchTasks error", err);
      // alert("Failed to load tasks");
    }
  };

  // Category handlers
  const handleAddOrEditCategory = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      alert("Category name required");
      return;
    }

    try {
      if (categoryForm.id === 0) {
        const res = await fetch(`${API_BASE}/categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: categoryForm.name }),
        });
        const created = await res.json();
        setCategories((c) => [...c, created]);
      } else {
        const res = await fetch(`${API_BASE}/categories/${categoryForm.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: categoryForm.name }),
        });
        const updated = await res.json();
        setCategories((c) => c.map((x) => (x.id === updated.id ? updated : x)));
      }
      setCategoryForm(emptyCategory);
    } catch (err) {
      console.error("category error", err);
      alert("Failed to save category");
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm("Delete this category and all its tasks?")) return;
    try {
      await fetch(`${API_BASE}/categories/${id}`, { method: "DELETE" });
      setCategories((c) => c.filter((cat) => cat.id !== id));
      setTasks((t) => t.filter((task) => task.category_id !== id));
      if (selectedCategoryId === id) setSelectedCategoryId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete category");
    }
  };

  const handleEditCategory = (cat: Category) => setCategoryForm(cat);

  // Task handlers
  const handleAddOrEditTask = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { id, category_id, title, description, due_date, status } = taskForm;

    if (!category_id) {
      alert("Select a category");
      return;
    }
    if (!title.trim()) {
      alert("Task title required");
      return;
    }

    try {
      if (id === 0) {
        const res = await fetch(`${API_BASE}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            due_date: due_date || null,
            status,
            category_id,
          }),
        });
        const created: Task = await res.json();
        // normalize date
        created.due_date = created.due_date ? new Date(created.due_date).toISOString().slice(0, 10) : "";
        setTasks((t) => [...t, created]);
      } else {
        const res = await fetch(`${API_BASE}/tasks/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            due_date: due_date || null,
            status,
            category_id,
          }),
        });
        const updated: Task = await res.json();
        updated.due_date = updated.due_date ? new Date(updated.due_date).toISOString().slice(0, 10) : "";
        setTasks((t) => t.map((x) => (x.id === updated.id ? updated : x)));
      }

      setTaskForm(emptyTask);
    } catch (err) {
      console.error("task save error", err);
      alert("Failed to save task");
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE" });
      setTasks((t) => t.filter((task) => task.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete task");
    }
  };

  const handleEditTask = (task: Task) => {
    setTaskForm({
      ...task,
      // ensure due_date is string YYYY-MM-DD
      due_date: task.due_date ? task.due_date.slice(0, 10) : "",
    });
  };

  const toggleTaskStatus = async (task: Task) => {
    try {
      const newStatus: TaskStatus = task.status === "pending" ? "completed" : "pending";
      const res = await fetch(`${API_BASE}/tasks/${task.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const updated: Task = await res.json();
      updated.due_date = updated.due_date ? updated.due_date.slice(0, 10) : "";
      setTasks((t) => t.map((x) => (x.id === updated.id ? updated : x)));
    } catch (err) {
      console.error(err);
      alert("Failed to toggle status");
    }
  };

  // Filtering: re-fetch tasks when selectedCategoryId changes (keeps server-driven view)
  useEffect(() => {
    if (selectedCategoryId) fetchTasks(selectedCategoryId);
    else fetchTasks();
  }, [selectedCategoryId]);

  const filteredTasks = tasks; // already fetched per selectedCategoryId
  const safeCategories = Array.isArray(categories) ? categories : [];

  return (
  <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
    <h1 className="text-3xl font-bold text-center text-indigo-600 mb-8">Task Manager</h1>

    {/* Categories Section */}
    <section className="mb-12 bg-white p-6 rounded-2xl shadow-md">
      <h2 className="text-2xl font-semibold mb-4 text-gray-700">Categories</h2>

      <ul className="space-y-2">
        {safeCategories.map((cat) => (
          <li
            key={cat.id}
            className={`flex items-center justify-between p-3 rounded-md cursor-pointer border 
              ${selectedCategoryId === cat.id ? "bg-indigo-100 border-indigo-400" : "hover:bg-gray-100"}`}
            onClick={() => setSelectedCategoryId(cat.id)}
          >
            <span className="font-medium">{cat.name}</span>
            <div className="space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditCategory(cat);
                }}
                className="px-3 py-1 text-sm bg-yellow-400 text-white rounded hover:bg-yellow-500 transition"
              >
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCategory(cat.id);
                }}
                className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Category Form */}
      <form onSubmit={handleAddOrEditCategory} className="mt-6 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Category name"
          value={categoryForm.name}
          onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
          className="flex-1 border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-indigo-400 focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
          >
            {categoryForm.id === 0 ? "Add Category" : "Update Category"}
          </button>
          {categoryForm.id !== 0 && (
            <button
              type="button"
              onClick={() => setCategoryForm(emptyCategory)}
              className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500 transition"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </section>

    {/* Tasks Section */}
    <section className="bg-white p-6 rounded-2xl shadow-md">
      <h2 className="text-2xl font-semibold mb-4 text-gray-700">
        Tasks{" "}
        {selectedCategoryId &&
          `in "${categories.find((c) => c.id === selectedCategoryId)?.name}"`}
      </h2>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="flex items-center gap-2">
          <span className="text-gray-600 font-medium">Filter by Category:</span>
          <select
            value={selectedCategoryId || ""}
            onChange={(e) =>
              setSelectedCategoryId(e.target.value ? Number(e.target.value) : null)
            }
            className="border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">All</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </label>
        {selectedCategoryId && (
          <button
            onClick={() => {
              setSelectedCategoryId(null);
              fetchTasks();
            }}
            className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Task List */}
      <ul className="space-y-3 mb-6">
        {filteredTasks.length === 0 && (
          <li className="text-gray-500 italic">No tasks found.</li>
        )}
        {filteredTasks.map((task) => (
          <li
            key={task.id}
            className={`p-4 rounded-md border shadow-sm ${
              task.status === "completed"
                ? "bg-green-50 border-green-300"
                : "bg-yellow-50 border-yellow-300"
            }`}
          >
            <strong className="text-lg text-gray-800">{task.title}</strong>{" "}
            <span className="text-sm text-gray-500">(Due: {task.due_date || "—"})</span>
            <p className="text-gray-600 italic mt-1">{task.description}</p>
            <p className="text-gray-600 mt-1">
              <span className="font-semibold">Category:</span>{" "}
              {task.category?.name ??
                categories.find((c) => c.id === task.category_id)?.name ??
                "—"}
            </p>
            <p className="text-gray-600 mt-1">
              <span className="font-semibold">Status:</span> {task.status}
            </p>

            <div className="mt-2 space-x-2">
              <button
                onClick={() => toggleTaskStatus(task)}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                Mark {task.status === "pending" ? "Completed" : "Pending"}
              </button>
              <button
                onClick={() => handleEditTask(task)}
                className="px-3 py-1 bg-yellow-400 text-white rounded hover:bg-yellow-500 transition"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteTask(task.id)}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Task Form */}
      <form onSubmit={handleAddOrEditTask} className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-700">
          {taskForm.id === 0 ? "Add Task" : "Edit Task"}
        </h3>

        <div>
          <label className="block text-gray-600 mb-1">Category:</label>
          <select
            value={taskForm.category_id || ""}
            onChange={(e) =>
              setTaskForm({ ...taskForm, category_id: Number(e.target.value) })
            }
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <input
          type="text"
          placeholder="Title"
          value={taskForm.title}
          onChange={(e) =>
            setTaskForm({ ...taskForm, title: e.target.value })
          }
          className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-indigo-400"
        />

        <textarea
          placeholder="Description"
          value={taskForm.description || ""}
          onChange={(e) =>
            setTaskForm({ ...taskForm, description: e.target.value })
          }
          className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-indigo-400"
        />

        <div>
          <label className="block text-gray-600 mb-1">Due Date:</label>
          <input
            type="date"
            value={taskForm.due_date || ""}
            onChange={(e) =>
              setTaskForm({ ...taskForm, due_date: e.target.value })
            }
            className="border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div>
          <label className="block text-gray-600 mb-1">Status:</label>
          <select
            value={taskForm.status}
            onChange={(e) =>
              setTaskForm({ ...taskForm, status: e.target.value as TaskStatus })
            }
            className="border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-indigo-400"
          >
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="px-5 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
          >
            {taskForm.id === 0 ? "Add Task" : "Update Task"}
          </button>
          {taskForm.id !== 0 && (
            <button
              type="button"
              onClick={() => setTaskForm(emptyTask)}
              className="px-5 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500 transition"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </section>
  </div>
);

};

export default TaskManager;
