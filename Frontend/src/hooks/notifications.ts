class NotificationService {
    showMessageNotification(sender: string, message: string, taskTitle?: string) {
      console.log("🔔 Notification triggered:", { sender, message, taskTitle }); // Add this
      
      // Check if browser supports notifications
      if (!('Notification' in window)) {
        console.log("❌ Browser doesn't support notifications");
        return;
      }

      console.log("📱 Notification permission:", Notification.permission); // Add this
  
      // Check if permission is already granted
      if (Notification.permission === 'granted') {
        console.log("✅ Permission granted, creating notification");
        this.createNotification(sender, message, taskTitle);
      } 
      // If permission is not denied, request it
      else if (Notification.permission !== 'denied') {
        console.log("📝 Requesting notification permission");
        Notification.requestPermission().then(permission => {
          console.log("📝 Permission result:", permission);
          if (permission === 'granted') {
            this.createNotification(sender, message, taskTitle);
          }
        });
      } else {
        console.log("❌ Notification permission denied");
      }
    }
  
    private createNotification(sender: string, message: string, taskTitle?: string) {
      console.log("🎯 Creating notification");
      const title = `💬 ${sender}`;
      const body = taskTitle 
        ? `${taskTitle}: ${this.truncateMessage(message)}`
        : this.truncateMessage(message);

      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico', // Your app icon
        badge: '/favicon.ico'
      });

      console.log("✅ Notification created:", { title, body });

      // Auto close after 4 seconds
      setTimeout(() => {
        notification.close();
        console.log("⏰ Notification auto-closed");
      }, 4000);

      // Focus app when clicked
      notification.onclick = () => {
        console.log("🖱️ Notification clicked");
        window.focus();
        notification.close();
      };
    }
  
    private truncateMessage(message: string, maxLength: number = 80): string {
      return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
    }
  }
  
  export const notificationService = new NotificationService();