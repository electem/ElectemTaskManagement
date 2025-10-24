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

  const handleCreateMember = async () => {
    if (!newMember.name || !newMember.email || !newMember.role) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const payload = {
        username: newMember.name,
        email: newMember.email,
        role: newMember.role,
      };

<<<<<<< HEAD
      const response = await fetch(import.meta.env.VITE_API_BASE + "/api/members", {
=======
      const response = await fetch("/api/members", {
>>>>>>> ca2965efbdb0910b36d6788750b8bbb771a50f83
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to create member");

      toast.success("Team member created successfully!");
      setNewMember({ name: "", email: "", role: "" });
      setIsMemberDialogOpen(false);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };
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
            <Dialog
              open={isMemberDialogOpen}
              onOpenChange={setIsMemberDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow-lg hover:from-indigo-600 hover:to-purple-600 transition-colors flex items-center justify-center">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Member
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create Team Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="member-name">Name</Label>
                    <Input
                      id="member-name"
                      value={newMember.name}
                      onChange={(e) =>
                        setNewMember({ ...newMember, name: e.target.value })
                      }
                      placeholder="Enter member name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newMember.email}
                      onChange={(e) =>
                        setNewMember({ ...newMember, email: e.target.value })
                      }
                      placeholder="member@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={newMember.role}
                      onChange={(e) =>
                        setNewMember({ ...newMember, role: e.target.value })
                      }
                      placeholder="Enter role (e.g., admin, member)"
                    />
                  </div>
                  <Button onClick={handleCreateMember} className="w-full">
                    Create Member
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
