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
          const username = data.currentUser;

          if (username) {              
              
              taskConnections.set(username, ws);

              // Optional: Attach the taskId to the ws object itself for easy lookup on disconnect
              ws.username = username; 

              console.log(`Task ID: ${username} registered. Clients now: ${taskConnections.size}.`);
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
    if (ws.username) {
      const username = ws.username;
      console.log(`Connection for Task ID ${username} closed. Clients remaining: ${taskConnections.size}.`);
      taskConnections.delete(username);       
    }
  });
});

export function broadcastUpdate(payload: any, taskId: string, currentUser: string) {
  const message = JSON.stringify(payload);

  for (const [key, client] of taskConnections) {
    if (key === currentUser) continue; // Skip this key
    console.log(`Value for ${key}:`, client.readyState);

    if (client.readyState === 1) {
      const data = {
        "payload":payload,
        "taskId":taskId,
        "currentUser":currentUser
      }
      client.send(JSON.stringify(data));
    }
  }
}