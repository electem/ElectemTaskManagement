import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  UserPlus,
  LogOut,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Task Management", url: "/tasks", icon: ListTodo },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const navigate = useNavigate();
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    role: "", // new field
  });

  const handleLogout = () => {
    localStorage.removeItem("username");
    navigate("/");
    toast.success("Logged out successfully!");
  };

  return (
    <Sidebar collapsible="icon">
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {open && (
          <h2 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
            TaskFlow
          </h2>
        )}
        <SidebarTrigger className={!open ? "mx-auto" : ""} />
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={!open ? "opacity-0" : ""}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg transition-smooth ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "hover:bg-sidebar-accent text-black"
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0 text-black" />
                      {open && (
                        <span className="font-medium text-black">
                          {item.title}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {open && (
          <div className="px-4 py-2 border-t border-sidebar-border mt-auto space-y-2">
          
            <Button
              onClick={handleLogout}
              className="w-full bg-red-600 text-white font-semibold shadow-lg hover:bg-red-700 transition-colors flex items-center justify-center"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
