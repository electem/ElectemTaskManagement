import { useState, useRef, useEffect } from "react";
import MsChatCommentsEditor from "./MsChatCommentsEditor.tsx";
import { useConversationContext } from "@/context/ConversationProvider.tsx";
import { useParams, useNavigate } from "react-router-dom"; // import useNavigate
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTaskContext } from "@/context/TaskContext";
import { useTaskHistory } from "@/context/TaskHistoryContext.tsx";
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
  const { title } = useParams<{ title: string }>();
  const navigate = useNavigate(); // initialize navigate
  if (!taskId) return <div>Task not found</div>;
  const taskIdNumber = Number(taskId);
  const description = localStorage.getItem("taskDescription");
  const [comment, setComment] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [fullViewImage, setFullViewImage] = useState<string | null>(null);

  const { conversations, fetchConversation, addMessage } =
    useConversationContext();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
 
  useEffect(() => {
    fetchConversation(taskIdNumber);
  }, [taskIdNumber]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations[taskIdNumber]]);

  const handleSendMessage = (text: string, mediaFiles?: File[]) => {
    const mediaUrls =
      mediaFiles?.map((file) => URL.createObjectURL(file)) || [];

    if (editingMessageId) {
      const updatedMessage: Message = {
        ...conversations[taskIdNumber].find((m) => m.id === editingMessageId)!,
        text,
        media: mediaUrls,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
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
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        fromMe: true,
      };
      addMessage(taskIdNumber, newMessage);
    }

    setComment("");
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#f5f5f5] dark:bg-[#1e1e1e] rounded-xl shadow-sm font-[Segoe UI,Arial,sans-serif] text-sm">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 shadow">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition text-gray-700 dark:text-gray-200 font-medium"
        >
          ← Back
        </button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <h1 className="text-xl font-semibold cursor-help">
                {title}
              </h1>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="w-10" /> {/* Placeholder for alignment */}
      </div>

      {/* Sticky editor */}
      <div className="sticky bottom-0 bg-[#f5f5f5] dark:bg-[#1e1e1e] px-2 py-1 border-t border-gray-300 dark:border-gray-700">
        {editingMessageId && (
          <div className="text-xs text-gray-500 mb-1 px-2">
            Editing message...
          </div>
        )}
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
          <img
            src={fullViewImage}
            className="max-h-[85%] max-w-[85%] rounded"
          />
        </div>
      )}
    </div>
  );
}
