import {
  LayoutDashboard,
  ListTodo,
  LogOut,
  FileText,
   Grid3X3
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Sidebar,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"; 
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SidebarContentSection } from "./SidebarContentSection"; // ✅ Import the new component

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Task Management", url: "/tasks", icon: ListTodo },
  { title: "Files", url: "/files", icon: FileText }, 
  { title: "Grid View", url: "/tasks/grid", icon: Grid3X3 },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
    toast.success("Logged out successfully!");
  };

  return (
    <Sidebar collapsible="icon">
      {/* Header / Top section */}
      <div className="flex items-center justify-between p-1 border-b border-sidebar-border">
        {open &&
          menuItems.map((item) => (
            <NavLink
              key={item.title}
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
            </NavLink>
          ))}

        {open && (
          <div className="px-4 py-2 border-t border-sidebar-border mt-auto space-y-2">
            <Button
              onClick={handleLogout}
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-sidebar-accent transition"
            >
              <LogOut className="mr-2 h-4 w-4" />
            </Button>
          </div>
        )}

        <SidebarTrigger className={!open ? "mx-auto" : ""} />
      </div>

      {/* ✅ Extracted Sidebar Content */}
      <SidebarContentSection
        open={open}
        menuItems={menuItems}
        handleLogout={handleLogout}
      />
    </Sidebar>
  );
}
