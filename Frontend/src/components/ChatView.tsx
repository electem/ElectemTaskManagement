import { useState, useRef, useEffect } from "react";
import MsChatCommentsEditor from "./MsChatCommentsEditor.tsx";
import { useConversationContext } from "@/context/ConversationProvider.tsx";
import { useParams, useNavigate } from "react-router-dom"; // import useNavigate
import { useWebSocket } from '@/context/WebSocketProvider';
import { useTaskContext } from '@/context/TaskContext';
interface Message {
  id: number;
  sender: string;
  text: string;
  time: string;
  fromMe: boolean;
  edited?: boolean;
  media?: string[];
}

export default function ChatView() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate(); // initialize navigate
  const { connectToTask } = useWebSocket();
  const { markTaskAsRead } = useTaskContext();
  if (!taskId) return <div>Task not found</div>;
  const taskIdNumber = Number(taskId);

  const [comment, setComment] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [fullViewImage, setFullViewImage] = useState<string | null>(null);

  const { conversations, fetchConversation, addMessage } = useConversationContext();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    connectToTask(taskIdNumber);

    // Mark as read when opening the chat
    markTaskAsRead(taskId);

    return () => {
      // Optional: Disconnect when leaving if needed
    };
  }, [taskIdNumber, connectToTask, markTaskAsRead]);
  useEffect(() => {
    fetchConversation(taskIdNumber);
  }, [taskIdNumber]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations[taskIdNumber]]);

  const handleSendMessage = (text: string, mediaFiles?: File[]) => {
    const mediaUrls = mediaFiles?.map((file) => URL.createObjectURL(file)) || [];

    if (editingMessageId) {
      const updatedMessage: Message = {
        ...conversations[taskIdNumber].find((m) => m.id === editingMessageId)!,
        text,
        media: mediaUrls,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        edited: true,
      };
      addMessage(taskIdNumber, updatedMessage, true);
      setEditingMessageId(null);
    } else {
      const newMessage: Message = {
        id: Date.now(),
        sender: "Surya",
        text,
        media: mediaUrls,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        fromMe: true,
      };
      addMessage(taskIdNumber, newMessage);
    }

    setComment("");
  };

  const handleEditMessage = (msgId: number) => {
    const msg = conversations[taskIdNumber]?.find((m) => m.id === msgId);
    if (!msg) return;

    setComment(msg.text);
    setEditingMessageId(msgId);
  };

  const messages = conversations[taskIdNumber] || [];

  return (
    <div className="flex flex-col h-full bg-[#f5f5f5] dark:bg-[#1e1e1e] rounded-xl shadow-sm font-[Segoe UI,Arial,sans-serif] text-sm">

      {/* Header */}
      <div className="p-2 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252526] rounded-t-xl flex items-center justify-between">
        <button
          className="text-[12px] text-blue-500 hover:underline"
          onClick={() => navigate(-1)} // go back
        >
          ← Back
        </button>
        <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">Chat</h2>
      </div>

      {/* Sticky editor */}
      <div className="sticky bottom-0 bg-[#f5f5f5] dark:bg-[#1e1e1e] px-2 py-1 border-t border-gray-300 dark:border-gray-700">
        {editingMessageId && <div className="text-xs text-gray-500 mb-1 px-2">Editing message...</div>}
        <MsChatCommentsEditor
          placeholder="Write rich comment..."
          className=""
          value={comment}
          taskId={taskIdNumber}
          onChange={setComment}
          onSend={handleSendMessage}
        />
      </div>

      {/* Full view modal */}
      {fullViewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50"
          onClick={() => setFullViewImage(null)}
        >
          <img src={fullViewImage} className="max-h-[85%] max-w-[85%] rounded" />
        </div>
      )}
    </div>
  );
}
