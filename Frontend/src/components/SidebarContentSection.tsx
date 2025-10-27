import { NavLink } from "react-router-dom";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import TaskListSidebar from "./TaskListSidebar";
import { LogOut } from "lucide-react";

interface SidebarContentSectionProps {
  open: boolean;
  menuItems: { title: string; url: string; icon: any }[];
  handleLogout: () => void;
}

export function SidebarContentSection({
  open,
  menuItems,
  handleLogout,
}: SidebarContentSectionProps) {
  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {/* Menu items (visible when sidebar collapsed) */}
            {!open &&
              menuItems.map((item) => (
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
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Task list */}
      <TaskListSidebar sidebarOpen={open} />

      {/* Logout when collapsed */}
      {!open && (
        <div className="flex justify-center mt-2">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-sidebar-accent transition"
          >
            <LogOut className="h-5 w-5 text-black" />
          </button>
        </div>
      )}
    </SidebarContent>
  );
}
