import React, { useRef, useState, useEffect } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import api from "@/lib/api";
import {
  Message,
  useConversationContext,
} from "@/context/ConversationProvider";

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
  const isPosting = useRef(false);

  // --- HERE: map messages to threads ---
  useEffect(() => {
    if (messages.length > 0) {
      const mappedThreads = messages.map((msg) => ({
        content: `${msg.sender}(${msg.time}): ${msg.text}`, // format like SHI(25/10 10:49): wwww
        replies: [], // no nested replies yet
      }));
      setThreads(mappedThreads);
    }
  }, [messages]);

  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = "";
    }
  }, []);

  useEffect(() => {
    highlightCodeBlocks();
  }, [html, threads]);

  // =========================
  // WebSocket Connection with Auto-Reconnect + Status Indicator
  // =========================
  const connectWebSocket = () => {
    const ws = new WebSocket("wss://iot.electems.com/task/ws");

    ws.onopen = () => {
      console.log("Connected to WebSocket server");
      // Send a JSON object immediately after connection opens
      const initMessage = JSON.stringify({ type: "INIT", taskId });
      ws.send(initMessage);

      setRetryCount(0);
      setIsConnected(true);
      setSocket(ws);
    };

    // In MsChatCommentsEditor.tsx - Update the WebSocket message handler
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log("Received update:", msg);
      if (!isPosting.current) {
        setThreads(msg);
      }

      // 🎯 NEW: Trigger unread count for other users
      // Get current user from localStorage
      const currentUser = localStorage.getItem("username") || "Guest";
      const userPrefix = currentUser.substring(0, 3).toUpperCase();

      // Check if the message is from another user
      const latestMessage = msg[msg.length - 1];
      if (latestMessage && latestMessage.content) {
        const messageSender = latestMessage.content.match(/^(\w+)\(/);
        if (messageSender && messageSender[1] !== userPrefix) {
          // This message is from another user, increment unread count
          // We'll need to pass this information to parent components
          // For now, we'll use a custom event
          const unreadEvent = new CustomEvent("taskMessageReceived", {
            detail: { taskId, fromUser: messageSender[1] },
          });
          window.dispatchEvent(unreadEvent);
        }
      }
    };

    ws.onclose = () => {
      console.warn("WebSocket disconnected. Retrying...");
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
    return () => {
      if (socket) socket.close();
    };
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

  function handlePaste(e) {
    e.preventDefault();
    const clipboard = e.clipboardData;
    const htmlData = clipboard.getData("text/html");
    const textData = clipboard.getData("text/plain");

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
        const minute = String(now.getMinutes()).padStart(2, "0");
        const second = String(now.getSeconds()).padStart(2, "0");
        const dateTimeString = `${day}/${month} ${minute}:${second}`;
  
        // Create file embed HTML based on file type
        let fileEmbedHtml = "";
        if (file.type.startsWith("image/")) {
          fileEmbedHtml = `<img src='${data.url}' alt='${file.name}' class='max-w-[200px] w-auto h-auto rounded-md my-2 cursor-pointer' />`;
        } else if (file.type.startsWith("video/")) {
          fileEmbedHtml = `<video src='${data.url}' controls class='max-w-[200px] rounded-md my-2'></video>`;
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
          let parent = updatedThreads[parentIndex];
          if (replyIndex !== null) parent = parent.replies[replyIndex];
          parent.replies = [...(parent.replies || []), newThread];
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

  function handleInput() {
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
      isPosting.current = true;
      await api.post("/messages/upsert", {
        taskId,
        newMessage: messageData,
        isEdit,
      });
      setTimeout(() => {
        isPosting.current = false;
      }, 1000); // short cooldown to avoid self duplication
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
  
    // Get day, month, minute, and second
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
    const minute = String(now.getMinutes()).padStart(2, "0");
    const second = String(now.getSeconds()).padStart(2, "0");
  
    // Create the date/time string: DD/MM MI:SS
    const dateTimeString = `${day}/${month} ${minute}:${second}`;
  
    // 3. Prepend the prefix and date/time to innerHTML
    const finalInnerHTML = `${usernamePrefix}(${dateTimeString}): ${innerHTML}`;
  
    // Example output: JON(25/10 48:31): <div>Hello world!</div>
    if (!finalInnerHTML.trim()) return;
  
    const updatedThreads = [...threads];
    // const newMessageObj = { content: finalInnerHTML, replies: [] };
  
    if (editing) {
      const { path } = editing;
      const target = path.length
        ? getReplyByPath(updatedThreads[path[0]], path.slice(1))
        : updatedThreads[path[0]];
      if (target) target.content = finalInnerHTML;
      setThreads(updatedThreads);
      setEditing(null);
      
      // For editing, send the updated threads array
      await uploadThreadsToBackend(updatedThreads, true);
    } else {
      const newThread = { content: finalInnerHTML, replies: [] };
  
      if (parentIndex === null) {
        updatedThreads.push(newThread);
      } else {
        let parent = updatedThreads[parentIndex];
        if (replyIndex !== null) parent = parent.replies[replyIndex];
        parent.replies = [...(parent.replies || []), newThread];
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
      editorRef.current.innerHTML = target.content;
      setHtml(target.content);
      setEditing({ path });
    }
  }

  function toggleCollapse(id) {
    setCollapsed({ ...collapsed, [id]: !collapsed[id] });
  }

  const MessageContent = ({ htmlContent }: { htmlContent: string }) => {
    const handleImageClick = (url: string) => {
      window.open(url, "_blank");
    };
  
    return (
      <div
        className="message-content"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          // If clicked element is an <img>, open in new tab
          if (target.tagName === "IMG") {
            handleImageClick((target as HTMLImageElement).src);
          }
        }}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  };
  

  const renderReplies = (replies, path, level = 1, parentId = "") => {
    return replies.map((reply, i) => {
      const replyPath = [...path, i];
      const replyId = `${parentId}-${i}`;
      const isCollapsed = collapsed[replyId];

      return (
        <div
          key={replyId}
          className={`ml-${level * 4} mt-2 border-l-2 pl-2 border-gray-300`}
        >
          <div className="flex justify-between items-center">
           <MessageContent htmlContent={reply.content} />
            <div className="flex gap-2 text-sm">
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
              <button
                className="hover:text-gray-500"
                onClick={() => toggleCollapse(replyId)}
                title="Collapse / Expand"
              >
                {isCollapsed ? "▶" : "▼"}
              </button>
            </div>
          </div>

          {!isCollapsed && reply.replies && reply.replies.length > 0 && (
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
              const isCollapsed = collapsed[threadId];
              return (
                <div key={threadId} className="mb-2">
                  <div className="flex justify-between items-center">
                  <MessageContent htmlContent={thread.content} />
                    <div className="flex gap-2 text-sm">
                      <button
                        className="hover:text-blue-600"
                        onClick={() => handleSend(index)}
                        title="Reply"
                      >
                        ↩
                      </button>
                      <button
                        className="hover:text-green-600"
                        onClick={() => handleEdit(threadPath)}
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        className="hover:text-gray-500"
                        onClick={() => toggleCollapse(threadId)}
                        title="Collapse / Expand"
                      >
                        {isCollapsed ? "▶" : "▼"}
                      </button>
                    </div>
                  </div>
                  {!isCollapsed &&
                    thread.replies &&
                    thread.replies.length > 0 &&
                    renderReplies(thread.replies, threadPath, 1, threadId)}
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
        </div>
      </div>

      <div className="relative flex items-center border rounded-2xl shadow-sm overflow-hidden bg-white">
        <div
          ref={editorRef}
          onPaste={handlePaste}
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          contentEditable
          suppressContentEditableWarning
          className={`min-h-[120px] flex-1 p-4 outline-none break-words whitespace-pre-wrap prose prose-slate list-disc pl-5 ${
            isFocused ? "ring-2 ring-slate-200" : ""
          }`}
          aria-label="Rich text comment editor"
          style={{ whiteSpace: "pre-wrap" }}
        />

        <div className="absolute right-3 bottom-3 flex items-center gap-2">
          <label
            className={`cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded ${
              uploading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            📎
            <input
              type="file"
              className="hidden"
              onChange={(e) => handleFileUpload(e, taskId)} 
              disabled={uploading}
            />
          </label>
          <button
            onClick={() => handleSend()}
            className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition"
            title="Send"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
