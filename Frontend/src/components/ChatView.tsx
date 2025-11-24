import { useState, useRef, useEffect } from "react";
import MsChatCommentsEditor from "./MsChatCommentsEditor.tsx";
import { useConversationContext } from "@/context/ConversationProvider.tsx";
import { useParams, useNavigate } from "react-router-dom"; // import useNavigate
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTaskContext } from "@/context/TaskContext";
import { FileText, X } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import MsgBox from "./MsgBox.tsx";
import linkifyHtml from "linkify-html";

interface Message {
  id: number;
  sender: string;
  text: string;
  time: string;
  fromMe: boolean;
  edited?: boolean;
  media?: string[];
}
interface Note {
  content: string;
  replies?: Note[];
}


export default function ChatView() {
  const { taskId } = useParams<{ taskId: string }>();
  const { title } = useParams<{ title: string }>();
  const navigate = useNavigate(); // initialize navigate
  const taskIdNumber = Number(taskId);
  const description = localStorage.getItem("taskDescription");
  const [comment, setComment] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [fullViewImage, setFullViewImage] = useState<string | null>(null);
  const { latestWsMessage, tasks } = useTaskContext(); // Add this
  const [notesOpen, setNotesOpen] = useState(false);
  const [projectNotes, setProjectNotes] = useState<{ content: string }[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const notesContainerRef = useRef<HTMLDivElement | null>(null);

  const { conversations, fetchConversation, addMessage } =
    useConversationContext();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);


  useEffect(() => {
    fetchConversation(taskIdNumber);
    localStorage.setItem("opendTaskId", taskIdNumber.toString());
    return () => {
      localStorage.removeItem("opendTaskId");
    };
  }, [taskIdNumber]);

  useEffect(() => {
  if (notesOpen && notesContainerRef.current) {
    notesContainerRef.current.scrollTo({
      top: notesContainerRef.current.scrollHeight,
      behavior: "smooth", // smooth scrolling
    });
  }
}, [notesOpen, projectNotes]);


  useEffect(() => {
    if (latestWsMessage && latestWsMessage.taskId === taskIdNumber) {
      // Refresh conversation when new message arrives for this task
      fetchConversation(taskIdNumber);
    }
  }, [latestWsMessage, taskIdNumber]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations[taskIdNumber]]);

    if (!taskId) return <div>Task not found</div>;


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
  async function fetchProjectNotes() {
  const currentTask = tasks.find((t) => t.id === taskIdNumber);
  const projectId = currentTask?.projectId;
  if (!projectId) return;

  setLoadingNotes(true);
  try {
    const res = await api.get(`/notes/${projectId}`);
    if (res.data?.found) {
      setProjectNotes(res.data.notes);
    } else {
      setProjectNotes([]);
    }
  } catch (err) {
    console.error("Failed to fetch notes", err);
    toast.error("Failed to fetch notes");
  } finally {
    setLoadingNotes(false);
  }
}
function toggleNotesSlider() {
  if (!notesOpen) fetchProjectNotes(); // fetch when opening
  setNotesOpen(prev => !prev);
}
function NoteItem({ note }: { note: Note }) {
  // MessageContent renderer
 const MessageContent = ({ htmlContent }: { htmlContent: string }) => {
  // Make URLs clickable
  const clickable = linkifyHtml(htmlContent, {
    target: "_blank",
    rel: "noopener noreferrer",
    className: "text-blue-600 underline",
  });

  return (
    <>
      <div
        className="message-content break-words break-all whitespace-pre-wrap"
        style={{
          wordBreak: "break-word",
          overflowWrap: "anywhere",
          whiteSpace: "pre-wrap",
        }}
        dangerouslySetInnerHTML={{ __html: clickable }}
      />

      <style>{`
        .message-content, 
        .message-content * {
          overflow-wrap: anywhere !important;
          word-break: break-word !important;
        }

        .message-content pre,
        .message-content code {
          white-space: pre-wrap !important;
          word-break: break-word !important;
          overflow-wrap: anywhere !important;
        }

        .message-content img {
          max-width: 100%;
          height: auto;
          display: inline-block;
        }

        .message-content {
          display: block !important;
        }
      `}</style>
    </>
  );
};


 const renderReplies = (replies: Note[],) => (
    <div className="ml-4">
      {replies.map((reply, idx) => (
        <NoteItem key={idx} note={reply} />
      ))}
    </div>
  );

  return (
    <MsgBox
      thread={note}
      threadPath={[0]}       
      threadId={"note"}
      onReply={() => {}}     
      onEdit={() => {}}
      onAddNote={() => {}}
      onCreateTask={() => {}}
      renderReplies={renderReplies}
      MessageContent={MessageContent}
      showActions={false}    // ✅ hides buttons
    />
  );
}


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
              <h1 className="text-xl font-semibold cursor-help">{title}</h1>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="max-w-xs text-sm text-muted-foreground">
                {description}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <button
          onClick={toggleNotesSlider}
          className="flex items-center justify-center p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          title="Project Notes"
        >
          <FileText size={24} />
        </button>
        {/* Placeholder for alignment */}
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
      {notesOpen && (
        <div className="fixed top-0 right-0 w-96 h-full bg-white dark:bg-gray-800 shadow-xl z-50 flex flex-col">
          <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold">Project Notes</h2>
            <button
              onClick={() => setNotesOpen(false)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
          <div
            ref={notesContainerRef}
            className="flex-1 overflow-y-auto p-3 space-y-2"
          >
            {loadingNotes && (
              <div className="text-sm text-gray-500">Loading...</div>
            )}
            {!loadingNotes && projectNotes.length === 0 && (
              <div className="text-sm text-gray-400">No notes yet.</div>
            )}
            {projectNotes.map((note, idx) => (
              <div
                key={idx}
                className="p-2 border rounded-md bg-gray-50 dark:bg-gray-900"
              >
                <NoteItem key={idx} note={note} />
              </div>
            ))}
          </div>
        </div>
      )}

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
