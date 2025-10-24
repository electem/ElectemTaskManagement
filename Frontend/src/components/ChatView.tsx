import { useState, useRef, useEffect } from "react";
import MsChatCommentsEditor from "./MsChatCommentsEditor.tsx";
import { useConversationContext } from "@/context/ConversationProvider.tsx";
import { useParams } from "react-router-dom";

interface Message {
  id: number;
  sender: string;
  text: string;
  time: string;
  fromMe: boolean;
  edited?: boolean;
  media?: string[]; // media URLs
}

export default function ChatView() {
  const { taskId } = useParams<{ taskId: string }>(); // params are always strings
  if (!taskId) return <div>Task not found</div>;
  const taskIdNumber = Number(taskId);
  console.log("taskIdNumber", taskIdNumber);

  const [comment, setComment] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [fullViewImage, setFullViewImage] = useState<string | null>(null);

  const { conversations, fetchConversation, addMessage } = useConversationContext();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load messages from backend on mount or taskId change
  useEffect(() => {
    fetchConversation(taskIdNumber);
  }, [taskIdNumber]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations[taskIdNumber]]);

  const handleSendMessage = (text: string, mediaFiles?: File[]) => {
    const mediaUrls = mediaFiles?.map((file) => URL.createObjectURL(file)) || [];

    if (editingMessageId) {
      // EDIT existing message
      const updatedMessage: Message = {
        ...conversations[taskIdNumber].find((m) => m.id === editingMessageId)!,
        text,
        media: mediaUrls,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        edited: true,
      };
      addMessage(taskIdNumber, updatedMessage, true); // pass a flag to indicate it's an update
      setEditingMessageId(null);
    } else {
      // NEW message
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

  console.log("messagesmessages", messages);

  return (
    <div className="flex flex-col h-full bg-[#f5f5f5] dark:bg-[#1e1e1e] rounded-xl shadow-sm font-[Segoe UI,Arial,sans-serif] text-sm">

  {/* Header */}
  <div className="p-2 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252526] rounded-t-xl">
    <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">Chat</h2>
  </div>

  {/* Messages */}
  <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
    {messages.map((msg) => (
      <div key={msg.id} className={`flex flex-col ${msg.fromMe ? "items-end" : "items-start"}`}>
        <div className={`text-[10px] mb-0.5 ${msg.fromMe ? "text-right text-gray-500" : "text-left text-gray-500"}`}>
          <span className="font-semibold">{msg.sender}</span>{" "}
          <span className="ml-1 text-gray-400">
            {msg.time} {msg.edited && <span className="text-[9px] italic ml-1">(Edited)</span>}
          </span>
        </div>

        <div className={`inline-flex items-center space-x-1 max-w-full`}>
          <div
            className={`px-2 py-1 text-[12px] leading-[16px] rounded-2xl break-words ${msg.fromMe
                ? "bg-[#cfe4ff] text-black rounded-br-none"
                : "bg-white dark:bg-[#2d2d2d] text-gray-900 dark:text-gray-100 rounded-bl-none"
              } shadow-sm flex-shrink-0`}
            style={{ maxWidth: "calc(100% - 30px)" }}
            dangerouslySetInnerHTML={{ __html: msg.text }}
          />
          <button
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs flex-shrink-0"
            title="Edit message"
            onClick={() => handleEditMessage(msg.id)}
          >
            ✏️
          </button>
        </div>

        {msg.media && msg.media.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {msg.media.map((url, idx) =>
              url.match(/\.(mp4|webm|ogg)$/) ? (
                <video key={idx} src={url} controls className="w-24 h-18 rounded" />
              ) : (
                <img
                  key={idx}
                  src={url}
                  className="w-20 h-20 object-cover rounded cursor-pointer"
                  onClick={() => setFullViewImage(url)}
                />
              )
            )}
          </div>
        )}
      </div>
    ))}
    <div ref={messagesEndRef} />
  </div>

  {/* Sticky editor */}
  <div className="sticky bottom-0 bg-[#f5f5f5] dark:bg-[#1e1e1e] px-2 py-1 border-t border-gray-300 dark:border-gray-700">
    {editingMessageId && <div className="text-xs text-gray-500 mb-1 px-2">Editing message...</div>}
    <MsChatCommentsEditor
      placeholder="Write rich comment..."
      className=""
      value={comment}
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
