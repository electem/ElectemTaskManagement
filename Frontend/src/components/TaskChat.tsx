import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Users } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
}

interface Task {
  id: string;
  title: string;
  owner: string;
  members: string[];
}

const TaskChat = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mock task data - in real app, fetch from your data source
  const [task, setTask] = useState<Task | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser] = useState("John Doe"); // In real app, get from auth context

  useEffect(() => {
    // Mock task data - replace with actual data fetching
    const mockTasks: Task[] = [
      {
        id: "1",
        title: "Update homepage design",
        owner: "John Doe",
        members: ["Jane Smith"],
      },
    ];

    const foundTask = mockTasks.find((t) => t.id === taskId);
    if (foundTask) {
      setTask(foundTask);
    } else {
      toast.error("Task not found");
      navigate("/task/tasks");
    }

    // Mock messages
    setMessages([
      {
        id: "1",
        sender: "John Doe",
        content: "Let's discuss the homepage redesign approach.",
        timestamp: new Date(Date.now() - 3600000),
      },
      {
        id: "2",
        sender: "Jane Smith",
        content: "I think we should focus on mobile-first design.",
        timestamp: new Date(Date.now() - 1800000),
      },
    ]);
  }, [taskId, navigate]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) {
      return;
    }

    const message: Message = {
      id: Date.now().toString(),
      sender: currentUser,
      content: newMessage,
      timestamp: new Date(),
    };

    setMessages([...messages, message]);
    setNewMessage("");
    toast.success("Message sent");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (!task) {
    return null;
  }

  const allParticipants = [task.owner, ...task.members];

  return (
    <div className="p-8 h-screen flex flex-col">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/task/tasks")}
          className="hover:bg-primary/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-1">{task.title}</h1>
          <p className="text-sm text-muted-foreground">Task Chat</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 overflow-hidden">
        <Card className="lg:col-span-3 flex flex-col shadow-md">
          <CardHeader className="border-b">
            <CardTitle className="text-lg">Messages</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message) => {
                  const isCurrentUser = message.sender === currentUser;
                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        isCurrentUser ? "flex-row-reverse" : ""
                      }`}
                    >
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarFallback className="text-xs bg-gradient-primary text-white">
                          {getInitials(message.sender)}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`flex flex-col gap-1 max-w-[70%] ${
                          isCurrentUser ? "items-end" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {message.sender}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                        <div
                          className={`rounded-lg p-3 ${
                            isCurrentUser
                              ? "bg-gradient-primary text-white"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} className="shadow-md">
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Participants
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {allParticipants.map((participant, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-smooth"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-gradient-primary text-white text-sm">
                      {getInitials(participant)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{participant}</p>
                    {participant === task.owner && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        Owner
                      </Badge>
                    )}
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

export default TaskChat;
