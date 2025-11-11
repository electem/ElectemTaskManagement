import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

const Login = () => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  function isAxiosError(
    error: unknown
  ): error is { response?: { data?: { message?: string } } } {
    return typeof error === "object" && error !== null && "response" in error;
  }
  const triggerWebSocketConnection = () => {
    window.dispatchEvent(new CustomEvent('userLoggedIn'));
  };
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
      // Send username to backend
      const res = await api.post("/api/auth/users", { username });

      // Response contains token and username
      const { token, username: returnedUsername, role } = res.data;

      // Store token & username in localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("username", returnedUsername);
      localStorage.setItem("role", role);

      toast({
        title: "Login Successful",
        description: `Welcome, ${returnedUsername}!`,
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));

      navigate("/task");
    } catch (err: unknown) {
      console.error(err);

      let message = "Failed to login. Try again later.";

      if (err instanceof Error) {
        message = err.message;
      } else if (isAxiosError(err)) {
        message = err.response?.data?.message || message;
      }

      toast({
        title: "Login Failed",
        description: message,
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
