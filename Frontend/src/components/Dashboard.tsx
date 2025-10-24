import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, ListTodo, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
const Dashboard = () => {
  const stats = [
    {
      title: "Total Projects",
      value: "12",
      icon: FolderKanban,
      gradient: "from-primary to-primary-glow",
    },
    {
      title: "Active Tasks",
      value: "48",
      icon: ListTodo,
      gradient: "from-accent to-primary",
    },
    {
      title: "Team Members",
      value: "8",
      icon: Users,
      gradient: "from-primary-glow to-accent",
    },
    {
      title: "Completed",
      value: "124",
      icon: CheckCircle2,
      gradient: "from-accent to-primary-glow",
    },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your task management system.
        </p>
      </div>
      

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="relative overflow-hidden group hover:shadow-lg transition-smooth"
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-5 group-hover:opacity-10 transition-smooth`}
            />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: "New project created", project: "Website Redesign", time: "2 hours ago" },
                { action: "Task completed", project: "Mobile App", time: "5 hours ago" },
                { action: "Member added", project: "API Development", time: "1 day ago" },
              ].map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-smooth"
                >
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1">
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">{activity.project}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Project Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Website Redesign", progress: 75, status: "In Progress" },
                { name: "Mobile App", progress: 45, status: "In Progress" },
                { name: "API Development", progress: 90, status: "Review" },
              ].map((project, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{project.name}</span>
                    <span className="text-sm text-muted-foreground">{project.progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-primary rounded-full transition-smooth"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
