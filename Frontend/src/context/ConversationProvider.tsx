import { createContext, useContext, useState, ReactNode } from "react";
import { toast } from "sonner";
import api from "@/lib/api"; // Axios instance with interceptor

export interface Message {
  id: number;
  sender: string;
  text: string;
  time: string;
  fromMe: boolean;
  edited?: boolean;
  media?: string[];
  replies?: Message[]; // ✅ Add this
}
interface RawMessage {
  content: string;
  replies?: RawMessage[];
  [key: string]: unknown; // optional extra fields
}


interface ConversationContextType {
  conversations: Record<number, Message[]>; // key = taskId
  fetchConversation: (taskId: number) => Promise<void>;
  addMessage: (taskId: number, newMessage: Message, isEdit?: boolean) => Promise<void>;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export const ConversationProvider = ({ children }: { children: ReactNode }) => {
  const [conversations, setConversations] = useState<Record<number, Message[]>>({});

  function mapConversation(conversation: RawMessage[]): Message[] {
    const currentUser = localStorage.getItem("username") || "";
  
    return conversation.map((item) => {
      // Expected format: "SHI(25/10 36:05): hiii"
      const match = item.content?.match(/^(\w+)\(([^)]+)\):\s*(.*)$/);
  
      let sender = "";
      let time = "";
      let text = item.content || "";
  
      if (match) {
        sender = match[1];
        time = match[2];
        text = match[3];
      }
  
      const message: Message = {
        id: Date.now() + Math.random(),
        sender,
        text,
        time,
        fromMe: sender === currentUser || sender === "", // treat no-sender as mine if needed
        media: [],
        replies: item.replies ? mapConversation(item.replies) : [],
      };
  
      return message;
    });
  }
  
  

  // Fetch conversation for a task
  const fetchConversation = async (taskId: number) => {
    try {
      const res = await api.get("/messages", { params: { taskId } });
      const rawData = Array.isArray(res.data) ? res.data : [];

      console.log("rawData",rawData);
      
      const messages = mapConversation(rawData);
      setConversations((prev) => ({ ...prev, [taskId]: messages }));
    } catch (err) {
      console.error("Error fetching conversation:", err);
      toast.error("Failed to fetch conversation");
    }
  };

  const fetchBulkConversations = async (taskIds: number[]) => {
  try {
    const res = await api.post("/messages/bulk", { taskIds });
    const data = res.data || [];

    const mapped: Record<number, Message[]> = {};
    data.forEach((msg) => {
      const conversation = Array.isArray(msg.conversation)
        ? mapConversation(msg.conversation)
        : [];
      mapped[msg.taskId] = conversation;
    });

    setConversations((prev) => ({ ...prev, ...mapped }));
  } catch (err) {
    console.error("Error fetching bulk conversations:", err);
    toast.error("Failed to fetch conversations");
  }
};

  

  // Add new message or upsert conversation
  const addMessage = async (taskId: number, newMessage: Message, isEdit = false) => {
    try {
      setConversations((prev) => {
        const taskMessages = prev[taskId] || [];
        const updatedMessages = isEdit
          ? taskMessages.map((m) => (m.id === newMessage.id ? newMessage : m))
          : [...taskMessages, newMessage];
        return { ...prev, [taskId]: updatedMessages };
      });

      // Call backend to save/update
      await api.post("/messages/upsert", { taskId, newMessage, isEdit });
    } catch (err) {
      console.error("Error adding message:", err);
      toast.error("Failed to add message");
    }
  };

  return (
    <ConversationContext.Provider
      value={{
        conversations,
        fetchConversation,
        addMessage,
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
};

export const useConversationContext = () => {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error("useConversationContext must be used within a ConversationProvider");
  }
  return context;
};
