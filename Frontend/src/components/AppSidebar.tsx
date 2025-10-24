import { LayoutDashboard, FolderKanban, ListTodo, UserPlus } from "lucide-react";
import { NavLink } from "react-router-dom";
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
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Task Management", url: "/tasks", icon: ListTodo },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const handleCreateMember = () => {
    if (!newMember.name || !newMember.email) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    // TODO: Store team member in global state or backend
    toast.success("Team member created successfully!");
    setNewMember({ name: "", email: "", phone: "", password: "" });
    setIsMemberDialogOpen(false);
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
                      {open && <span className="font-medium text-black">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {open && (
          <div className="px-4 py-2 border-t border-sidebar-border mt-auto">
            <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full shadow-md">
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
                      onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                      placeholder="Enter member name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newMember.email}
                      onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                      placeholder="member@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={newMember.phone}
                      onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                      placeholder="123-456-7890"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newMember.password}
                      onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                      placeholder="Enter password"
                    />
                  </div>
                  <Button onClick={handleCreateMember} className="w-full">
                    Create Member
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
