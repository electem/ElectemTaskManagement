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

import { TaskProvider } from "@/context/TaskContext";
import { ProjectProvider } from './context/ProjectContext';
import { ConversationProvider } from "./context/ConversationProvider";

const queryClient = new QueryClient();

// Main layout component
const AppLayout = () => {
  const location = useLocation();

  // Only show sidebar if we are NOT on the login page
  const showSidebar = location.pathname !== "/";

  return (
    <div className="flex min-h-screen w-full">
      {showSidebar && <AppSidebar />}
      <main className="flex-1 bg-gradient-subtle">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Index />} />
          <Route path="/task" element={<Index />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/tasks/new" element={<TaskFormPage />} />
          <Route path="/tasks/:taskId/edit" element={<TaskFormPage />} />
          <Route path="/tasks/:taskId/chat" element={<ChatView />} />
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
        <TaskProvider>
          <ConversationProvider>
            <ProjectProvider>
              <SidebarProvider defaultOpen={false}>
                <AppLayout />
              </SidebarProvider>
            </ProjectProvider>
          </ConversationProvider>
        </TaskProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
