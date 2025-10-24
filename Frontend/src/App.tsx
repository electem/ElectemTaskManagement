
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import ProjectsPage from "./pages/ProjectsPage";
import TasksPage from "./pages/TasksPage";
import NotFound from "./pages/NotFound";
import TaskChatPage from "./pages/TaskChatPage";
import ChatView from "./components/ChatView";
import TaskFormPage from "./pages/TaskFormPage";
import { TaskProvider } from "@/context/TaskContext";
import { ProjectProvider } from './context/ProjectContext';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
       <TaskProvider>
        <ProjectProvider>
        <SidebarProvider defaultOpen={false}>
          <div className="flex min-h-screen w-full">
            <AppSidebar />
            <main className="flex-1 bg-gradient-subtle">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/tasks/new" element={<TaskFormPage />} />
                <Route path="/tasks/:taskId/edit" element={<TaskFormPage />} />
                {/* <Route path="/tasks/:taskId/chat" element={<TaskChatPage />} /> */}
                <Route path="/tasks/:taskId/chat" element={<ChatView />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </SidebarProvider>
        </ProjectProvider>
        </TaskProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;