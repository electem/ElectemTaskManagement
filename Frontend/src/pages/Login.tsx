import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      toast({
        title: "Error",
        description: "Please enter a username",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Fetch users from API on login click
      const res = await axios.get("/api/users");
      const users = Array.isArray(res.data) ? res.data : [];

      // Match username (case-insensitive)
      const matchedUser = users.find(
        (user) => user.username.toLowerCase() === username.toLowerCase()
      );

      if (!matchedUser) {
        toast({
          title: "Login Failed",
          description: "Username not found",
          variant: "destructive",
        });
        return;
      }

      // Store username in localStorage
      localStorage.setItem("username", matchedUser.username);

      toast({
        title: "Login Successful",
        description: `Welcome, ${matchedUser.username}!`,
      });

      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to fetch users. Try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>Enter your username to access the dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
