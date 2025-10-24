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
}

interface ConversationContextType {
  conversations: Record<number, Message[]>; // key = taskId
  fetchConversation: (taskId: number) => Promise<void>;
  addMessage: (taskId: number, newMessage: Message, isEdit?: boolean) => Promise<void>;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export const ConversationProvider = ({ children }: { children: ReactNode }) => {
  const [conversations, setConversations] = useState<Record<number, Message[]>>({});

  // Fetch conversation for a task
  const fetchConversation = async (taskId: number) => {
    try {
      const res = await api.get("/messages", { params: { taskId } });
      const messages = Array.isArray(res.data) ? res.data : [];
      setConversations((prev) => ({ ...prev, [taskId]: messages }));
    } catch (err) {
      console.error("Error fetching conversation:", err);
      toast.error("Failed to fetch conversation");
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
