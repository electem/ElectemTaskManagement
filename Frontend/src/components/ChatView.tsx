import { useState, useRef, useEffect } from "react";
import MsChatCommentsEditor from "./MsChatCommentsEditor.tsx";

export default function ChatView() {
    const [comment, setComment] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, sender: "Shiva", text: "Did you check my changes?", time: "10:00 AM", fromMe: false },
    { id: 2, sender: "Surya", text: "Yes, looks great!", time: "10:01 AM", fromMe: true },
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleAddComment = (text) => {
    const msg = {
      id: Date.now(),
      sender: "Surya",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      fromMe: true,
    };
    setMessages([...messages, msg]);
  };

  return (
    <div className="flex flex-col h-full bg-[#f5f5f5] dark:bg-[#1e1e1e] rounded-xl shadow-sm font-[Segoe UI,Arial,sans-serif]">
      {/* Header */}
      <div className="p-3 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252526] rounded-t-xl">
        <h2 className="text-[15px] font-semibold text-gray-800 dark:text-gray-200">Chat</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {messages.map((msg, i) => {
          const prev = messages[i - 1];
          const showHeader = !prev || prev.sender !== msg.sender;
          return (
            <div key={msg.id} className={`flex flex-col ${msg.fromMe ? "items-end" : "items-start"}`}>
              {showHeader && (
                <div
                  className={`text-[12px] mb-1 ${
                    msg.fromMe ? "text-right text-gray-500" : "text-left text-gray-500"
                  }`}
                >
                  <span className="font-semibold">{msg.sender}</span>{" "}
                  <span className="ml-1 text-gray-400">{msg.time}</span>
                </div>
              )}
              <div
                className={`max-w-[75%] px-4 py-[6px] text-[14px] leading-[20px] rounded-2xl ${
                  msg.fromMe
                    ? "bg-[#cfe4ff] text-black rounded-br-none"
                    : "bg-white dark:bg-[#2d2d2d] text-gray-900 dark:text-gray-100 rounded-bl-none"
                } shadow-sm`}
                dangerouslySetInnerHTML={{ __html: msg.text }}
              />
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <MsChatCommentsEditor
        placeholder="Write rich comment..."
        className="mt-4"
        value={comment}                // 👈 pass down current HTML
        onChange={(html) => setComment(html)} // 👈 get updated HTML
      />
    </div>
  );
}
