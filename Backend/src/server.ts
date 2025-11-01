import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import taskRoutes from "./routes/task.routes";

import userRoutes from "./routes/userRoutes";
import memberRoutes from "./routes/member.routes";
import metricsRoutes from "./routes/metrics.routes";
import messageRoute from "./routes/message.routes"
import metricsSchedulerRoutes from "./scheduler/metrics.scheduler.route"
import authRoutes from "./routes/authRoutes"
import projectRoutes from "./routes/projects";
import fileRoutes from "./routes/fileRoutes";
import { WebSocketServer } from "ws";
import path from "path";
import taskHistoryRoutes from "./routes/taskHistory.routes"; // ✅ NEW
import prisma from "./prisma/client";
import fileUploadRoutes from "./routes/fileUploadRoutes";

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
app.use('/metrics', metricsRoutes);
app.use('/metrics/scheduler', metricsSchedulerRoutes);


app.use("/", fileUploadRoutes);


app.get("/health", (req, res) => res.json({ status: "OK", message: "Server running" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
console.log("✅ Server started")
const wss = new WebSocketServer({ port: 8089 });

const taskConnections = new Map();

wss.on("connection", (ws) => {
  console.log("🟢 New WebSocket client connected");

  ws.on("message", async function incoming(message: string) {
    try {
      console.log("📨 Incoming message from client:", message);

      const data = JSON.parse(message);

      // 🧩 INIT event — triggered when user connects
      if (data.type === "INIT") {
        const username = data.currentUser;
        console.log(`⚙️ INIT received from: ${username}`);

        // ✅ Save connection FIRST before processing updates
        taskConnections.set(username, ws);
        ws.username = username;
        console.log(`✅ Connection saved for user ${username}`);

        const user = await prisma.user.findUnique({ where: { username } });
        let lastLogin = user?.lastLogin ?? new Date(0);
        const now = new Date();

        // Calculate time difference
        const hoursDiff =
          (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60);
        console.log(
          `🕓 Last login for ${username}: ${lastLogin}, diff: ${hoursDiff.toFixed(
            2
          )} hrs`
        );

        // Adjust window if > 6 hrs
        if (hoursDiff > 6) {
          lastLogin = new Date(lastLogin.getTime() - 2 * 60 * 60 * 1000);
          console.log(`⏪ Adjusted last login by -2 hrs: ${lastLogin}`);
        }

        // Fetch user tasks
        const userTasks = await prisma.task.findMany({
          where: {
            OR: [{ owner: username }, { members: { has: username } }],
          },
          select: { id: true },
        });
        const taskIds = userTasks.map((t) => t.id);
        console.log(`🧾 ${username} is part of tasks: [${taskIds.join(", ")}]`);

        // Fetch updated messages
        const updatedMessages = await prisma.message.findMany({
          where: {
            taskId: { in: taskIds },
            updatedAt: { gt: lastLogin },
          },
          select: {
            taskId: true,
            conversation: true,
            updatedAt: true,
          },
        });

        const updatedTaskIds = updatedMessages.map((m) => m.taskId);
        if (updatedTaskIds.length === 0) {
          console.log(
            `📭 No updated messages for ${username} since ${lastLogin}`
          );
        } else {
          console.log(
            `📬 Found ${
              updatedTaskIds.length
            } updated task(s) for ${username}: [${updatedTaskIds.join(", ")}]`
          );
        }

        // ✅ Add a small delay to ensure frontend is ready
        setTimeout(() => {
          // Loop through updated tasks and broadcast
          for (const taskId of updatedTaskIds) {
            const msg = updatedMessages.find((m) => m.taskId === taskId);
            console.log(
              `🔄 Broadcasting updates for task ${taskId} (user: ${username})`
            );
            if (msg) {
              console.log(
                "🗣 Message payload:",
                JSON.stringify(msg.conversation).slice(0, 200),
                "..."
              );
              broadcastUpdate(msg.conversation, taskId.toString(), username,false);
            } else {
              console.warn(`⚠️ No message object found for task ${taskId}`);
            }
          }
        }, 100); // 100ms delay to ensure frontend is ready
      }
      await prisma.user.updateMany({
        where: { username: ws.username },
        data: { lastLogin: new Date() },
      });
    } catch (e) {
      console.error("❌ Invalid WebSocket message or processing error:", e);
    }
  });

  ws.on("close", async (code, reason) => {
    if (ws.username) {
      console.log(
        `🔴 Client disconnected: ${ws.username} (code ${code}, reason: ${reason})`
      );
      await prisma.user.updateMany({
        where: { username: ws.username },
        data: { lastLogin: new Date() },
      });
      taskConnections.delete(ws.username);
    } else {
      console.log("🔴 Unidentified WebSocket client disconnected");
    }
  });
});

export function broadcastUpdate(payload: any, taskId: string, currentUser: string ,skipSelf: boolean = true) {
  const message = JSON.stringify(payload);

  for (const [key, client] of taskConnections) {


    
    if (skipSelf && key === currentUser) continue;// Skip this key
    console.log(`Value for ${key}:`, client.readyState);

    if (client.readyState === 1) {
      const data = {
        "payload":payload,
        "taskId":taskId,
        currentUser: (!skipSelf && key === currentUser) ? "electem" : currentUser
      }
      client.send(JSON.stringify(data));
      console.log("===========================");
      console.log(skipSelf && key === currentUser);
    }
  }
}