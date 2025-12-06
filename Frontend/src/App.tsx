import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

import Index from "./pages/Index";
import TasksPage from "./pages/TasksPage";
import NotFound from "./pages/NotFound";
import ChatView from "./components/ChatView";
import TaskFormPage from "./pages/TaskFormPage";
import Login from "./pages/Login";

import { ProjectProvider } from "./context/ProjectContext";
import { ConversationProvider } from "./context/ConversationProvider";
import { TaskHistoryProvider } from "./context/TaskHistoryContext"; // ✅ new import
import FilesPage from "./pages/FilesPage";
import ProtectedRoute from "./ProtectedRoute";
import TaskGridView from "./components/TaskGridView";
import { TaskProvider } from "./context/TaskContext";
import { Dashboard } from "./components/Dashboard";
import AutoLogout from "./components/AutoLogout";
import OnlineUsersPage from "./pages/OnlineUsersPage";

const queryClient = new QueryClient();

// Layout component
// Layout component
const AppLayout = () => {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const showSidebar = location.pathname !== "/login" && !!token; // ✅ only show if token exists

  return (
    <div className="flex min-h-screen w-full">
      {showSidebar && <AppSidebar />}
      <main className="flex-1 bg-gradient-subtle overflow-hidden">
        <Routes>
          {/* Public Route */}
          <Route path="/task/login" element={<Login />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/task/dashboard" element={<Dashboard />} />
            <Route path="/task" element={<Index />} />
            <Route path="/task/tasks" element={<TasksPage />} />
            <Route path="/task/tasks/grid" element={<TaskGridView />} />
            <Route path="/task/files" element={<FilesPage />} />
            <Route path="/task/tasks/new" element={<TaskFormPage />} />
            <Route path="/task/tasks/:taskId/edit" element={<TaskFormPage />} />
            <Route path="/task/tasks/:taskId/:title/chat" element={<ChatView />} />
            <Route path="/task/users/online" element={<OnlineUsersPage />} />

          </Route>

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
};


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
       <AutoLogout />
        <TaskProvider>
          <ConversationProvider>
            <ProjectProvider>
              {/* ✅ Added TaskHistoryProvider here */}
              <TaskHistoryProvider>
                <SidebarProvider defaultOpen={false}>
                  <AppLayout />
                </SidebarProvider>
              </TaskHistoryProvider>
            </ProjectProvider>
          </ConversationProvider>
        </TaskProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
