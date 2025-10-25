import { createContext, useContext, useEffect, ReactNode } from 'react';
import { websocketService } from '@/services/websocketService';
import { useTaskContext } from './TaskContext';

interface WebSocketContextType {
  connectToTask: (taskId: number) => void;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const { incrementUnreadCount } = useTaskContext();

  useEffect(() => {
    // Listen for unread messages
    websocketService.onUnreadMessage((taskId, fromUser) => {
      console.log(`New message from ${fromUser} in task ${taskId}`);
      incrementUnreadCount(taskId.toString());
    });

    return () => {
      websocketService.disconnect();
    };
  }, [incrementUnreadCount]);

  const connectToTask = (taskId: number) => {
    websocketService.connect(taskId);
  };

  const disconnect = () => {
    websocketService.disconnect();
  };

  return (
    <WebSocketContext.Provider value={{ connectToTask, disconnect }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};