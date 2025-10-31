import React, { useRef, useState, useEffect } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import api from "@/lib/api";
import { Upload } from "lucide-react"; // 👈 add this at the top
import {
  Message,
  useConversationContext,
} from "@/context/ConversationProvider";
import { useTaskContext } from "@/context/TaskContext";
import { useUsers } from "@/hooks/useUsers";

interface Props {
  placeholder?: string;
  className?: string;
  taskId: number;
  value?: string;
  onChange?: (html: string) => void;
  onSend?: (html: string) => void;
}

export default function MsChatCommentsEditor({
  placeholder = "Write a comment...",
  className = "max-w-2xl mx-auto",
  taskId,
  value = "",
  onChange,
  onSend,
}: Props) {
  const editorRef = useRef(null);
  const [html, setHtml] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [threads, setThreads] = useState([]);
  const [collapsed, setCollapsed] = useState({});
  const [editing, setEditing] = useState(null); // { path: [indexes] }
  const currentUser = localStorage.getItem("username") || "Guest";
  const [socket, setSocket] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const { conversations } = useConversationContext();
  const messages: Message[] = conversations[taskId] || [];
  const currentTaskID = useRef(0);
  const { incrementUnreadCount } = useTaskContext();
  const [mentionList, setMentionList] = useState<string[]>([]);
  const [filteredMentions, setFilteredMentions] = useState<string[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ x: 0, y: 0 });
  const [mentionSearch, setMentionSearch] = useState("");
  const { users } = useUsers();

  // --- HERE: map messages to threads ---
  useEffect(() => {
    if (messages.length > 0) {
      const mapMessagesToThreads = (msgs) =>
        msgs.map((msg) => ({
          content: `${msg.sender}(${msg.time}): ${msg.text}`,
          replies: msg.replies ? mapMessagesToThreads(msg.replies) : [],
        }));

      const mappedThreads = mapMessagesToThreads(messages);

      setThreads((prev) =>
        JSON.stringify(prev) === JSON.stringify(mappedThreads)
          ? prev
          : mappedThreads
      );
      currentTaskID.current = taskId;
    }
  }, [messages]);

  useEffect(() => {
    const videos = document.querySelectorAll("video");
    videos.forEach((v) => {
      v.addEventListener("timeupdate", () => {
        v.dataset.time = v.currentTime.toString();
      });
    });
  
    return () => {
      videos.forEach((v) => {
        const savedTime = parseFloat(v.dataset.time || "0");
        v.currentTime = savedTime;
      });
    };
  }, [threads]);
  

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Scroll smoothly to bottom when threads change
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threads]);

  useEffect(() => {
    if (Array.isArray(users) && users.length > 0) {
      const currentUser = localStorage.getItem("username");
      const usernames = users
        .map((user) => user.username)
        .filter((username) => (Boolean(username)) && username !== currentUser); // remove undefined/null if any
      const username = localStorage.getItem("username")

      setMentionList(usernames);
    }
  }, [users]);

  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = "";
    }
  }, []);

  useEffect(() => {
    highlightCodeBlocks();
  }, [threads]);

  // =========================
  // WebSocket Connection with Auto-Reconnect + Status Indicator
  // =========================
  const connectWebSocket = () => {
    const ws = new WebSocket(import.meta.env.VITE_WS_API_BASE);
    console.log("ENV", import.meta.env.VITE_WS_API_BASE);


    ws.onopen = () => {
      console.log("Connected to WebSocket server");
      // Send a JSON object immediately after connection opens
      const initMessage = JSON.stringify({ type: "INIT", currentUser, taskId });
      ws.send(initMessage);

      setRetryCount(0);
      setIsConnected(true);
      setSocket(ws);
    };

    // In MsChatCommentsEditor.tsx - Update the WebSocket message handler
    ws.onmessage = (event) => {
      const response = JSON.parse(event.data);
      console.log("Received update:", response, currentTaskID.current);
      const { currentUser: senderName } = response;
      if (response.taskId == currentTaskID.current) {
        setThreads(response.payload);
      }
      console.log("Received update:", taskId, currentUser);
      const username = localStorage.getItem("username") || "";
      const filteredUsername = username.substring(0, 3).toLowerCase();
      const isSender = senderName?.toLowerCase() === username;
      const payload = response.payload;

      if (isSender) {
        console.log("🟡 Message from self — no unread increment");
        return;
      }
      // ✅ Check if payload is an array and not empty
      let messageText = "";

      if (Array.isArray(payload) && payload.length > 0) {
        // Get the last message object
        const lastMessage = payload[payload.length - 1];

        // Extract its "content" property
        messageText = lastMessage.content || "";
      }

      console.log("payload:", payload);
      console.log("messageText:", messageText);

      const lastPart = messageText.split(";").pop()?.trim() || "";
      console.log("lastPart", lastPart);

      const hasMention = lastPart.toLowerCase().includes(`@${filteredUsername}`);
      console.log("hasMention", hasMention);
      const existingMessages = conversations?.[response.taskId] || [];
      const newPayload = response.payload || [];

      // Normalize both message arrays to same comparable structure
      const existingNormalized = existingMessages.map(
        (m) => `${m.sender}(${m.time}): ${m.text}`
      );
      const payloadNormalized = newPayload.map((p) => p.content);

      const isDifferent =
        JSON.stringify(existingNormalized) !==
        JSON.stringify(payloadNormalized);

      const currentPathParts = window.location.pathname.split("/");
      const currentTaskIdFromUrl = currentPathParts[2]
        ? Number(currentPathParts[2])
        : null;
      if (response.taskId !== currentTaskIdFromUrl && response.currentUser !== currentUser && isDifferent) {
        console.log("incrementUnreadCount update:");
        incrementUnreadCount(response.taskId, hasMention, hasMention ? filteredUsername : null, senderName) // sender name);
      }
    };

    ws.onclose = (ev) => {
      console.warn("WebSocket disconnected. Retrying...", ev.code, ev.reason);
      setIsConnected(false);
      setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        connectWebSocket();
      }, Math.min(5000, (retryCount + 1) * 1000)); // Exponential backoff up to 5s
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      ws.close();
    };
  };

  useEffect(() => {
    connectWebSocket();
  }, []);

  function highlightCodeBlocks() {
    if (!editorRef.current) return;
    const codeBlocks = editorRef.current.querySelectorAll("pre code");
    codeBlocks.forEach((block) => hljs.highlightElement(block));
  }

  function detectLanguage(text) {
    const result = hljs.highlightAuto(text);
    return result.language || "plaintext";
  }

  function sanitizeHtml(dirty) {
    if (!dirty) return "";
    const doc = new DOMParser().parseFromString(dirty, "text/html");
    doc.querySelectorAll("script,style").forEach((n) => n.remove());
    const all = doc.querySelectorAll("*");
    all.forEach((el) => {
      [...el.attributes].forEach((attr) => {
        if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
      });
    });
    return doc.body.innerHTML;
  }

  async function handlePaste(e) {
    e.preventDefault();
    const clipboard = e.clipboardData;
    const htmlData = clipboard.getData("text/html");
    const textData = clipboard.getData("text/plain");

    // --- 1️⃣ Check if user pasted an image ---
    const items = clipboard?.items;
    if (items) {
      for (const item of items) {
        if (item.type.indexOf("image") !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            // ✅ Convert blob to a File object
            const file = new File([blob], "pasted-image.png", { type: blob.type });

            // ✅ Reuse your handleFileUpload logic
            await handleFileUpload({ target: { files: [file] } }, taskId);
            return; // stop further paste handling
          }
        }
      }
    }

    let payload = "";
    if (htmlData) {
      payload = sanitizeHtml(htmlData);
    } else if (textData) {
      const language = detectLanguage(textData);
      const paragraphs = textData
        .split(/\n{2,}/)
        .map(
          (p) =>
            `<pre><code class='language-${language}'>${escapeHtml(
              p
            )}</code></pre>`
        )
        .join("");
      payload = paragraphs;
    }

    insertHtmlAtCaret(payload);
    syncHtml();
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function insertHtmlAtCaret(html) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      editorRef.current.insertAdjacentHTML("beforeend", html);
      return;
    }
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const fragment = range.createContextualFragment(html);
    range.insertNode(fragment);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function wrapSelectionWithCodeBlock() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const selectedText = sel.toString();
    const language = detectLanguage(selectedText);
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.className = `language-${language}`;
    code.textContent = selectedText;
    pre.appendChild(code);
    range.deleteContents();
    range.insertNode(pre);
    range.setStartAfter(pre);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    hljs.highlightElement(code);
  }

  function handleKeyDown(e) {
    if (e.ctrlKey && e.key === "c") {
      e.preventDefault();
      wrapSelectionWithCodeBlock();
      syncHtml();
    }
  }

  async function handleFileUpload(e, taskId) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("taskId", taskId);

      const res = await api.post("/uploads", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const data = res.data;
      if (data && data.url) {
        // Get username and timestamp (same logic as handleSend)
        const fullUsername = localStorage.getItem("username") || "---";
        const usernamePrefix = fullUsername.substring(0, 3).toUpperCase();

        const now = new Date();
        const day = String(now.getDate()).padStart(2, "0");
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");

        const dateTimeString = `${day}/${month} ${hours}:${minutes}`;
        // Create file embed HTML based on file type
        let fileEmbedHtml = "";
        if (file.type.startsWith("image/")) {
          fileEmbedHtml = `<img src='${data.url}' alt='${file.name}' class='max-w-[200px] w-auto h-auto rounded-md my-2 cursor-pointer' />`;
        } else if (file.type.startsWith("video/")) {
          fileEmbedHtml = `<video src='${data.url}'controls class='w-[300px] h-[200px] rounded-md my-2 object-cover'></video>`;
        } else {
          fileEmbedHtml = `<a href='${data.url}' target='_blank' class='text-blue-600 underline'>${file.name}</a>`;
        }

        // Create the complete message content with user info and file (same format as handleSend)
        const finalInnerHTML = `${usernamePrefix}(${dateTimeString}): ${fileEmbedHtml}`;

        // Use the SAME LOGIC as handleSend for updating threads
        const updatedThreads = [...threads];
        const newThread = { content: finalInnerHTML, replies: [] };

        // For file uploads, always create as top-level message (parentIndex = null)
        // If you want file uploads to be replies, you can pass parentIndex and replyIndex as parameters
        const parentIndex = null; // Top-level message
        const replyIndex = null;

        if (parentIndex === null) {
          updatedThreads.push(newThread);
        } else {
          // Reply case
          const parentThread = updatedThreads[parentIndex];
          if (replyIndex !== null) {
            parentThread.replies[replyIndex].replies = [
              ...(parentThread.replies[replyIndex].replies || []),
              newThread,
            ];
          } else {
            parentThread.replies = [...(parentThread.replies || []), newThread];
          }

          // 🔥 Move parent thread to bottom
          const movedThread = updatedThreads.splice(parentIndex, 1)[0];
          updatedThreads.push(movedThread);
        }
        setThreads(updatedThreads);

        // Use the SAME LOGIC as handleSend for backend upload
        // For new file messages, send only the new message object (same as handleSend)
        await uploadThreadsToBackend(updatedThreads, false);

        // Clear the file input
        e.target.value = '';
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  }

  function getCaretCoordinates() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return { x: 0, y: 0 };
    const range = selection.getRangeAt(0).cloneRange();
    range.collapse(false);
    const rects = range.getClientRects();
    if (rects.length > 0) {
      const rect = rects[0];
      return { x: rect.left, y: rect.bottom + window.scrollY };
    }
    const span = document.createElement("span");
    range.insertNode(span);
    const rect = span.getBoundingClientRect();
    const coords = { x: rect.left, y: rect.bottom + window.scrollY };
    span.parentNode?.removeChild(span);
    return coords;
  }


  function handleInput(e) {


    const sel = window.getSelection();
    const range = sel?.getRangeAt(0);
    if (!range) return;

    // Get text before cursor
    const textBeforeCursor = range.startContainer.textContent?.substring(0, range.startOffset) || "";

    const mentionMatch = textBeforeCursor.match(/@(\w*)$/); // detect @ + partial name
    if (mentionMatch) {
      const partial = mentionMatch[1].toLowerCase();
      const filtered = mentionList.filter((name) =>
        name.toLowerCase().startsWith(partial)
      );
      setFilteredMentions(filtered);
      setMentionSearch(partial);
      setShowMentions(true);

      // Get cursor position for dropdown
      const coords = getCaretCoordinates();
      setMentionPosition(coords);

    } else {
      setShowMentions(false);
    }
  }

  function insertMention(username: string) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    const node = range.startContainer;

    // Replace partial mention
    const text = node.textContent || "";
    const newText = text.replace(/@\w*$/, `@${username} `);
    node.textContent = newText;

    // Move cursor to end
    range.setStart(node, newText.length);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    setShowMentions(false);
    syncHtml();
  }



  function syncHtml() {
    const inner = editorRef.current ? editorRef.current.innerHTML : "";
    setHtml(inner);
  }

  function getReplyByPath(root, path) {
    let current = root;
    for (const idx of path) {
      if (!current.replies || !current.replies[idx]) {
        console.error(`Invalid path at index ${idx}`, current);
        return null;
      }
      current = current.replies[idx];
    }
    return current;
  }

  async function uploadThreadsToBackend(messageData: any, isEdit = false) {
    try {

      await api.post("/messages/upsert", {
        taskId,
        newMessage: messageData,
        currentUser,
        isEdit,
      });

    } catch (err) {
      console.error("Failed to upload conversation", err);
    }
  }

  async function handleSend(parentIndex = null, replyIndex = null) {
    const innerHTML = editorRef.current?.innerHTML?.trim() || "";

    // 1. Get username from local storage (assuming it's stored under the key 'username')
    const fullUsername = localStorage.getItem("username") || "---";
    // Extract the first three characters or use '---' as a fallback
    const usernamePrefix = fullUsername.substring(0, 3).toUpperCase();

    // 2. Format the current Date and Time
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    const dateTimeString = `${day}/${month} ${hours}:${minutes}`;

    // 3. Prepend the prefix and date/time to innerHTML
    const finalInnerHTML = `${usernamePrefix}(${dateTimeString}): ${innerHTML}`;

    // Example output: JON(25/10 48:31): <div>Hello world!</div>
    if (!finalInnerHTML.trim()) return;

    const updatedThreads = [...threads];
    // const newMessageObj = { content: finalInnerHTML, replies: [] };

    if (editing) {
      const { path } = editing;

      // 1️⃣ Remove the old message
      const removeMessage = (arr, path) => {
        if (path.length === 1) {
          arr.splice(path[0], 1);
        } else {
          const [first, ...rest] = path;
          removeMessage(arr[first].replies, rest);
        }
      };

      removeMessage(updatedThreads, path);

      // 2️⃣ Add the edited message at the bottom (latest)
      const newThread = { content: finalInnerHTML, replies: [] };
      updatedThreads.push(newThread);

      // 3️⃣ Update state & backend
      setThreads(updatedThreads);
      setEditing(null);

      await uploadThreadsToBackend(updatedThreads, true);
    }
    else {
      const newThread = { content: finalInnerHTML, replies: [] };

      if (parentIndex === null) {
        updatedThreads.push(newThread);
      } else {
       // Reply case
       const parentThread = updatedThreads[parentIndex];
       if (replyIndex !== null) {
         parentThread.replies[replyIndex].replies = [
           ...(parentThread.replies[replyIndex].replies || []),
           newThread,
         ];
       } else {
         parentThread.replies = [...(parentThread.replies || []), newThread];
       }
       // 🔥 Move parent thread to bottom
       const movedThread = updatedThreads.splice(parentIndex, 1)[0];
       updatedThreads.push(movedThread);
      }
      setThreads(updatedThreads);

      // For new messages, send only the new message object
      await uploadThreadsToBackend(updatedThreads, false);
    }

    editorRef.current.innerHTML = "";
    setHtml("");
  }

  function handleEdit(path) {
    let target = threads[path[0]];
    if (path.length > 1) target = getReplyByPath(target, path.slice(1));

    if (target) {
      // Extract only the message part (remove the prefix like ABC(29/10 11:12): )
      const contentWithoutPrefix = target.content.replace(
        /^[A-Z]{2,3}\(\d{2}\/\d{2}\s\d{2}:\d{2}\):\s*/,
        ""
      );

      if (editorRef.current) {
        editorRef.current.innerHTML = contentWithoutPrefix;
      }
      setHtml(contentWithoutPrefix);
      setEditing({ path });
    }
  }


  function toggleCollapse(id) {
    setCollapsed({ ...collapsed, [id]: !collapsed[id] });
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showMentions &&
        editorRef.current &&
        !(editorRef.current as HTMLElement).contains(e.target as Node)
      ) {
        setShowMentions(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showMentions]);

  const MessageContent = React.memo(({ htmlContent }: { htmlContent: string }) => {
    const handleImageClick = (url: string) => {
      window.open(url, "_blank");
    };
    const formattedContent = htmlContent.replace(
      /^([A-Z]{2,3})\((\d{2}\/\d{2}\s\d{2}:\d{2})\):/,
      `<span class="font-bold text-blue-600">$1</span><span class="font-bold text-blue-600">($2)</span>:`
    );

    return (
      <div
        className="message-content flex items-center flex-wrap"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.tagName === "IMG") {
            handleImageClick((target as HTMLImageElement).src);
          }
        }}
        dangerouslySetInnerHTML={{ __html: formattedContent }}
      />
    );
  },
  // ✅ Custom comparison: only re-render when content actually changes
  (prev, next) => prev.htmlContent === next.htmlContent
);



  const renderReplies = (replies, path, level = 1, parentId = "") => {
    return replies.map((reply, i) => {
      const replyPath = [...path, i];
      const replyId = `${parentId}-${i}`;

      return (
        <div
          key={replyId}
          className={`ml-${level * 4} mt-2 border-l-2 pl-2 ${
            level === 1
              ? "border-gray-400"
              : level === 2
              ? "border-gray-500"
              : level === 3
              ? "border-gray-600"
              : "border-gray-700"
          }`}
        >
          <div className="message-content flex items-center flex-wrap">
            
            <div className="flex gap-2 text-sm mr-3">
              <button
                className="hover:text-blue-600"
                onClick={() => handleSend(path[0], i)}
                title="Reply"
              >
                ↩
              </button>
              <button
                className="hover:text-green-600"
                onClick={() => handleEdit(replyPath)}
                title="Edit"
              >
                ✎
              </button>             
            </div>
            <MessageContent htmlContent={reply.content} />
          </div>
          { reply.replies && reply.replies.length > 0 && (
            <div>
              {renderReplies(reply.replies, replyPath, level + 1, replyId)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className={`${className} flex flex-col gap-3`}>
      <div className="mt-2 text-sm text-slate-600">
        <div className="bg-slate-50 p-3 rounded overflow-auto text-xs whitespace-pre-wrap prose prose-slate list-disc pl-5">
          {threads.length > 0 ? (
            threads.map((thread, index) => {
              const threadPath = [index];
              const threadId = `t-${index}`;
              return (
                <div key={threadId} className="relative mb-2">
                  {/* Message Box with rounded border */}
                  <div className="border border-gray-300 shadow-sm bg-white p-4 pl-6 mt-4 relative rounded-md">

                    {/* Floating Header Box */}
                    <div className="absolute -top-3 -left-1 bg-white border border-gray-300 px-3 py-1 flex rounded-md items-center gap-2 text-xs shadow-sm">
                      <span className="font-semibold text-blue-600">
                        {thread.content.match(/^([A-Z]{2,3})/)?.[1] || "USR"}
                      </span>
                      <span className="text-gray-500 text-[11px]">
                        {thread.content.match(/\((\d{2}\/\d{2}\s\d{2}:\d{2})\)/)?.[1] || "--:--"}
                      </span>

                      <div className="flex gap-1 ml-2">
                        <button
                          className="hover:text-blue-600 transition"
                          onClick={() => handleSend(index)}
                          title="Reply"
                        >
                          ↩
                        </button>
                        <button
                          className="hover:text-green-600 transition"
                          onClick={() => handleEdit(threadPath)}
                          title="Edit"
                        >
                          ✎
                        </button>
                      </div>
                    </div>

                    {/* Actual Message Content */}
                    <div className="mt-2">
                      <MessageContent htmlContent={thread.content} />
                    </div>
                    {thread.replies &&
                    thread.replies.length > 0 &&
                    renderReplies(thread.replies, threadPath, 1, threadId)}
                  </div>
                  
                </div>
              
              );
            })
          ) : html ? (
            <div dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <div className="text-slate-400">
              No content yet — start typing or paste formatted text.
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Message Input Area */}
      <div className="flex items-end border rounded-2xl shadow-sm bg-white p-2 w-full max-w-full overflow-hidden">
        <div
          ref={editorRef}
          onPaste={handlePaste}
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          contentEditable
          suppressContentEditableWarning
          className={`flex-1 min-h-[130px] max-h-[350px] overflow-y-auto p-3 outline-none break-words whitespace-pre-wrap w-full ${isFocused ? "ring-2 ring-slate-200" : ""
            }`}
          aria-label="Rich text comment editor"
          style={{
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
            overflowWrap: "break-word",
          }}
        />

        <div className="flex items-center gap-1 ml-2 shrink-0 pb-2">
          <label
            className={`cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 p-1 rounded-md text-sm ${uploading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            title="Attach file"
          >
            <Upload size={18} /> {/* 👈 Lucide Upload icon */}
            <input
              type="file"
              className="hidden"
              onChange={(e) => handleFileUpload(e, taskId)}
              disabled={uploading}
            />
          </label>

          <button
            onClick={() => handleSend()}
            className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 transition text-sm"
            title="Send"
          >
            ➤
          </button>
        </div>
         
      </div>
      {showMentions && filteredMentions.length > 0 && (
        <div
          className="absolute bg-white border rounded-md shadow-md z-50"
          style={{
            top: mentionPosition.y,
            left: mentionPosition.x,
            minWidth: "120px",
          }}
        >
          {filteredMentions.map((name) => (
            <div
              key={name}
              className="px-2 py-1 hover:bg-blue-100 cursor-pointer"
              onMouseDown={(e) => {
                e.preventDefault(); // prevent editor blur
                insertMention(name);
              }}
            >
              @{name}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
