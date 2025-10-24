import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import taskRoutes from "./routes/task.routes";
import projectRoutes from "./routes/projects";
import userRoutes from "./routes/userRoutes";


dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});


app.use("/tasks", taskRoutes);
app.use("/projects", projectRoutes);
app.use("/api", userRoutes);

app.get("/health", (req, res) => res.json({ status: "OK", message: "Server running" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
