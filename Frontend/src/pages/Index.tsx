import { useState } from "react";
import { SidebarContentSection } from "@/components/SidebarContentSection";
import { LayoutDashboard, FolderKanban, ListTodo, Grid3X3 } from "lucide-react";
import { Dashboard } from "@/components/Dashboard";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  const menuItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Projects", url: "/projects", icon: FolderKanban },
    { title: "Tasks", url: "/tasks", icon: ListTodo },
  ];

  const handleLogout = () => {
    console.log("User logged out");
  };

  const handleGridButtonClick = () => {
    navigate("/tasks/grid");
  };

  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Mobile View → Grid Button + Sidebar */}
      <div className="block md:hidden h-full">
        {/* Small button at top right corner for mobile view */}
        <div className="p-2 border-b flex justify-end">
          <button
            onClick={handleGridButtonClick}
            className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
            title="Open Grid View"
          >
            <Grid3X3 className="h-4 w-4" />
            <span>Grid</span>
          </button>
        </div>

        {/* Sidebar content below the button */}
        <SidebarContentSection
          open={open}
          menuItems={menuItems}
          handleLogout={handleLogout}
        />
      </div>

      {/* Desktop View → Dashboard */}
      <div className="hidden md:block flex-1 h-screen overflow-auto">
        <Dashboard/>
      </div>
    </div>
  );
};

export default Index;