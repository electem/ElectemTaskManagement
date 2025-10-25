import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import taskRoutes from "./routes/task.routes";

import userRoutes from "./routes/userRoutes";
import memberRoutes from "./routes/member.routes";
import messageRoute from "./routes/message.routes"
import authRoutes from "./routes/authRoutes"

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

app.use("/messages",messageRoute)
app.use("/tasks", taskRoutes);


app.use("/api/users", userRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/members", memberRoutes);

app.get("/health", (req, res) => res.json({ status: "OK", message: "Server running" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
