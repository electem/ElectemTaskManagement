import { useState } from "react";
import Dashboard from "@/components/Dashboard";
import { SidebarContentSection } from "@/components/SidebarContentSection";
import { LayoutDashboard, FolderKanban, ListTodo } from "lucide-react";

const Index = () => {
  const [open, setOpen] = useState(true);

  const menuItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Projects", url: "/projects", icon: FolderKanban },
    { title: "Tasks", url: "/tasks", icon: ListTodo },
  ];

  const handleLogout = () => {
    console.log("User logged out");
  };

  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Mobile View → Sidebar */}
      <div className="block md:hidden h-full">
        <SidebarContentSection
          open={open}
          menuItems={menuItems}
          handleLogout={handleLogout}
        />
      </div>

      {/* Desktop View → Dashboard */}
      <div className="hidden md:block flex-1 h-full">
        <Dashboard />
      </div>
    </div>
  );
};

export default Index;
