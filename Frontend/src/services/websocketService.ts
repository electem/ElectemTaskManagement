class WebSocketService {
  private socket: WebSocket | null = null;
  private messageCallbacks: ((data: any) => void)[] = [];
  private unreadCallbacks: ((taskId: string) => void)[] = [];

  connect(taskId: number) {
    if (this.socket) {
      this.socket.close();
    }

    this.socket = new WebSocket('ws://localhost:8089');

    this.socket.onopen = () => {
      console.log('Connected to WebSocket server');
      const initMessage = JSON.stringify({ type: 'INIT', taskId });
      this.socket?.send(initMessage);
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Notify all message callbacks
      this.messageCallbacks.forEach(callback => callback(data));

      // Check for new messages from other users for unread counts
      this.handleUnreadCounts(data, taskId);
    };

    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private handleUnreadCounts(data: any[], taskId: number) {
    if (!data.length) return;

    const currentUser = localStorage.getItem('username') || 'Guest';
    const userPrefix = currentUser.substring(0, 3).toUpperCase();
    const latestMessage = data[data.length - 1];

    if (latestMessage && latestMessage.content) {
      const messageSender = latestMessage.content.match(/^(\w+)\(/);
      if (messageSender && messageSender[1] !== userPrefix) {
        // Trigger unread callbacks - this message is from another user
        console.log(`New message from ${messageSender[1]} in task ${taskId}`);
        this.unreadCallbacks.forEach(callback => callback(taskId.toString()));
      }
    }
  }

  onMessage(callback: (data: any) => void) {
    this.messageCallbacks.push(callback);
  }

  onUnreadMessage(callback: (taskId: string) => void) {
    this.unreadCallbacks.push(callback);
  }

  sendMessage(message: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const websocketService = new WebSocketService();