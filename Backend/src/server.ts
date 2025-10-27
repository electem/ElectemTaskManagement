import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import taskRoutes from "./routes/task.routes";

import userRoutes from "./routes/userRoutes";
import memberRoutes from "./routes/member.routes";
import messageRoute from "./routes/message.routes"
import authRoutes from "./routes/authRoutes"
import projectRoutes from "./routes/projects";
import fileRoutes from "./routes/fileRoutes";
import path from "path";
import taskHistoryRoutes from "./routes/taskHistory.routes"; // ✅ NEW
import prisma from "./prisma/client";
import { WebSocketServer, WebSocket } from "ws";

// ✅ Extend WebSocket type to include custom fields
interface ExtendedWebSocket extends WebSocket {
  username?: string;
  taskId?: number;
}

dotenv.config();
const app = express();
app.use(cors({
  origin: "http://localhost:5173", // your frontend origin
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"], // <-- include Authorization
}));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});


// Serve uploads folder statically
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use("/messages",messageRoute)
app.use("/tasks", taskRoutes);
app.use("/projects", projectRoutes);
// ✅ Register Task History route
app.use("/task-history", taskHistoryRoutes);

app.use("/api/users", userRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/members", memberRoutes);
// Serve static files from uploads directory
app.use("/uploads", fileRoutes);

app.get("/health", (req, res) => res.json({ status: "OK", message: "Server running" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
console.log("✅ Server started")
// ==========================
// ✅ FIXED WebSocket Handling
// ==========================

const wss = new WebSocketServer({ port: 8089 });

// Store clients per taskId
// Structure: { taskId: [ { username, ws } ] }
const taskConnections: Record<string, { username: string; ws: any }[]> = {};

wss.on("connection", (ws: ExtendedWebSocket) => {

  console.log("✅ New WebSocket client connected");

  ws.on("message", async (message: string) => {
    try {
      const data = JSON.parse(message);

      if (data.type === "INIT") {
        const { currentUser, taskId } = data;
        if (!taskId || !currentUser) return;

        // Initialize array if not present
        if (!taskConnections[taskId]) taskConnections[taskId] = [];

        // Prevent duplicate connections for the same user-task combo
        const alreadyExists = taskConnections[taskId].some(
          (conn) => conn.username === currentUser
        );
        if (!alreadyExists) {
          taskConnections[taskId].push({ username: currentUser, ws });
        }

        ws.username = currentUser;
        ws.taskId = taskId;

        console.log(
          `🔗 Registered ${currentUser} for task ${taskId}. Total clients for this task: ${taskConnections[taskId].length}`
        );

        // Optional: send recent messages when connecting
        const messages = await prisma.message.findUnique({ where: { taskId } });
        if (messages?.conversation) {
          ws.send(
            JSON.stringify({
              payload: messages.conversation,
              taskId,
              currentUser,
              type: "INIT_RESPONSE",
            })
          );
        }
      }
    } catch (e) {
      console.error("❌ Invalid WS message:", e);
    }
  });

  ws.on("close", () => {
    // Remove user from the map when they disconnect
    if (ws.taskId && ws.username && taskConnections[ws.taskId]) {
      taskConnections[ws.taskId] = taskConnections[ws.taskId].filter(
        (conn) => conn.username !== ws.username
      );
      console.log(
        `❌ Disconnected ${ws.username} from task ${ws.taskId}. Remaining clients: ${taskConnections[ws.taskId].length}`
      );
    }
  });
});

// ✅ Broadcast update only to users connected to that taskId (excluding sender)
export function broadcastUpdate(payload: any, taskId: number, currentUser: string): void {

  const clients = taskConnections[taskId];
  if (!clients) return;

  const data = JSON.stringify({
    payload,
    taskId,
    currentUser,
    type: "TASK_UPDATE",
  });

  clients.forEach(({ username, ws }) => {
    if (username !== currentUser && ws.readyState === 1) {
      ws.send(data);
    }
  });

  console.log(`📢 Broadcasted update for task ${taskId} to ${clients.length} clients`);
}
