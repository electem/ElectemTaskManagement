import React from "react";
import { FileText } from "lucide-react";

interface Thread {
  content: string;
  replies?: Thread[];
}

interface MsgBoxProps {
  thread: Thread;
  threadPath: number[];
  threadId: string;
  onReply: (index: number) => void;
  onEdit: (path: number[]) => void;
  onAddNote: (path: number[]) => void;
  onCreateTask: (path: number[]) => void;
  renderReplies: (
    replies: Thread[],
    path: number[],
    level: number,
    parentId: string
  ) => React.ReactNode;
  MessageContent: React.ComponentType<{ htmlContent: string }>;

  showActions?: boolean;
}



const MsgBox: React.FC<MsgBoxProps> = ({
  thread,
  threadPath,
  threadId,
  onReply,
  onEdit,
  onAddNote,
  onCreateTask,
  renderReplies,
  MessageContent,
  showActions = true,
}) => {
  const cleanedContent = thread.content.replace(/^(?:\(\):\s*)+/g, "");
  return (
   <div className="border border-gray-300 shadow-sm bg-white p-4 pl-6 mt-4 relative rounded-lg">

  {/* ✅ Show floating header only for top-level threads */}
  {threadPath.length === 1 && (
    <div className="absolute -top-3 -left-2 bg-white border border-gray-300 px-3 flex rounded-md items-center gap-2 text-xs shadow-sm">
      <span className="font-semibold text-blue-600">
      {cleanedContent.match(/(?:\(\):\s*)*([A-Za-z]+)\(/)?.[1] || "USR"}
      </span>
      <span className="text-gray-500 text-[11px]">
        {cleanedContent.match(/\((\d{2}\/\d{2}\s\d{2}:\d{2})\)/)?.[1] || "--:--"}
      </span>

      {showActions && (
        <div className="flex gap-4 ml-2">
          <button
            className="hover:text-blue-600 transition w-7 h-7 flex items-center justify-center rounded-md text-base font-bold hover:bg-blue-50"
            onClick={() => onReply(threadPath[0])}
            title="Reply"
          >
            ↩
          </button>
          <button
            className="hover:text-blue-600 transition w-7 h-7 flex items-center justify-center rounded-md text-base font-bold hover:bg-blue-50"
            onClick={() => onEdit(threadPath)}
            title="Edit"
          >
            ✎
          </button>
          <button
            className="hover:text-blue-600 transition w-7 h-7 flex items-center justify-center rounded-md hover:bg-blue-50"
            onClick={() => onAddNote(threadPath)}
            title="Add Note"
          >
            <FileText size={17} />
          </button>
          <button
            className="hover:text-blue-600 transition w-7 h-7 flex items-center justify-center rounded-md hover:bg-blue-50"
            onClick={() => onCreateTask(threadPath)}
            title="Create Task"
          >
            🗒️
          </button>
        </div>
      )}
    </div>
  )}

  {/* Message Body  */}
  <div className="mt-3">
    <MessageContent htmlContent={cleanedContent} />
  </div>

  {/* Replies */}
  {thread.replies && thread.replies.length > 0 &&
    renderReplies(thread.replies, threadPath, 1, threadId)}
</div>

  );
};

export default MsgBox;
