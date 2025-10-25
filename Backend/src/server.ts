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
import { WebSocketServer } from "ws";
import path from "path";
dotenv.config();
const app = express();
app.use(cors({
  origin: "http://localhost:5173", // your frontend origin
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"], // <-- include Authorization
}));
app.use(express.json());
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");  
  next();
});


// Serve uploads folder statically
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use("/messages",messageRoute)
app.use("/tasks", taskRoutes);
app.use("/projects", projectRoutes);

app.use("/api/users", userRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/members", memberRoutes);
// Serve static files from uploads directory
app.use("/uploads", fileRoutes);

app.get("/health", (req, res) => res.json({ status: "OK", message: "Server running" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const wss = new WebSocketServer({ port: 8089 });

const taskConnections = new Map();

wss.on('connection', (ws) => {

  console.log('New client connected');

  ws.on('message', function incoming(message:string) {
    try {
        const data = JSON.parse(message);

        if (data.type === 'INIT') {
          const taskId = data.taskId;

          if (taskId) {
              // 2. Get the Set for this taskId, or create a new one if it doesn't exist
              if (!taskConnections.has(taskId)) {
                  taskConnections.set(taskId, new Set());
              }
              
              const clientSet = taskConnections.get(taskId);
              
              // 3. Add the new ws object to the Set
              clientSet.add(ws);
              
              // Optional: Attach the taskId to the ws object itself for easy lookup on disconnect
              ws.taskId = taskId; 

              console.log(`Task ID: ${taskId} registered. Clients now: ${clientSet.size}.`);
        } else {
            // Handle regular messages here
            console.log(`Received regular message: ${data}`);
        }
      }
      } 
      catch (e) {
          console.error('Received non-JSON or invalid message:', message);
      }
  });

  ws.on('close', () => {
    if (ws.taskId) {
        const taskId = ws.taskId;
        const clientSet = taskConnections.get(taskId);
        
        if (clientSet) {
          // Remove the specific ws object from the Set
          clientSet.delete(ws);
          console.log(`Connection for Task ID ${taskId} closed. Clients remaining: ${clientSet.size}.`);

          // If the Set is now empty, clean up the Task ID entry in the main Map
          if (clientSet.size === 0) {
              taskConnections.delete(taskId);
              console.log(`Task ID ${taskId} removed from registry (0 clients).`);
          }
        }
      }
  });
});

export function broadcastUpdate(payload: any, taskId: string) {
  const message = JSON.stringify(payload);
  const clients = taskConnections.get(taskId);
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}