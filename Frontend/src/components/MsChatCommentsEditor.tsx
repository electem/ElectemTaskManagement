import React, { useRef, useState, useEffect } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";

export default function MsChatCommentsEditor({
  placeholder = "Write a comment...",
  className = "max-w-2xl mx-auto",
}) {
  const editorRef = useRef(null);
  const [html, setHtml] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [threads, setThreads] = useState([]);
  const [collapsed, setCollapsed] = useState({});
  const [editing, setEditing] = useState(null); // { path: [indexes] }

  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = "";
    }
  }, []);

  useEffect(() => {
    highlightCodeBlocks();
  }, [html, threads]);

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
        .map((p) => `<pre><code class='language-${language}'>${escapeHtml(p)}</code></pre>`)
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

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("http://localhost:4000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data && data.url) {
        let embedHtml = "";
        if (file.type.startsWith("image/")) {
          embedHtml = `<img src='${data.url}' alt='uploaded image' class='max-w-full rounded-md my-2' />`;
        } else if (file.type.startsWith("video/")) {
          embedHtml = `<video src='${data.url}' controls class='max-w-full rounded-md my-2'></video>`;
        } else {
          embedHtml = `<a href='${data.url}' target='_blank' class='text-blue-600 underline'>${file.name}</a>`;
        }
        insertHtmlAtCaret(embedHtml);
        syncHtml();
      }
    } catch (err) {
      console.error("Upload failed", err);
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
      if (!current.replies || !current.replies[idx]) return null;
      current = current.replies[idx];
    }
    return current;
  }

  async function uploadThreadsToBackend(updatedThreads) {
    try {
      await fetch("http://localhost:4000/save-conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation: updatedThreads }),
      });
    } catch (err) {
      console.error("Failed to upload conversation", err);
    }
  }

  async function handleSend(parentIndex = null, replyIndex = null) {
    const innerHTML = editorRef.current?.innerHTML || "";
    if (!innerHTML.trim()) return;

    const updatedThreads = [...threads];

    if (editing) {
      const { path } = editing;
      const target = path.length ? getReplyByPath(updatedThreads[path[0]], path.slice(1)) : updatedThreads[path[0]];
      if (target) target.content = innerHTML;
      setThreads(updatedThreads);
      setEditing(null);
    } else {
      const newThread = { content: innerHTML, replies: [] };

      if (parentIndex === null) {
        updatedThreads.push(newThread);
      } else {
        let parent = updatedThreads[parentIndex];
        if (replyIndex !== null) parent = parent.replies[replyIndex];
        parent.replies = [...(parent.replies || []), newThread];
      }
      setThreads(updatedThreads);
    }

    await uploadThreadsToBackend(updatedThreads);

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

  const renderReplies = (replies, path, level = 1, parentId = "") => {
    return replies.map((reply, i) => {
      const replyPath = [...path, i];
      const replyId = `${parentId}-${i}`;
      const isCollapsed = collapsed[replyId];

      return (
        <div key={replyId} className={`ml-${level * 4} mt-2 border-l-2 pl-2 border-gray-300`}>
          <div className="flex justify-between items-center">
            <div dangerouslySetInnerHTML={{ __html: reply.content }} />
            <div className="flex gap-2 text-sm">
              <button className="hover:text-blue-600" onClick={() => handleSend(path[0], i)} title="Reply">↩</button>
              <button className="hover:text-green-600" onClick={() => handleEdit(replyPath)} title="Edit">✎</button>
              <button className="hover:text-gray-500" onClick={() => toggleCollapse(replyId)} title="Collapse / Expand">{isCollapsed ? "▶" : "▼"}</button>
            </div>
          </div>

          {!isCollapsed && reply.replies && reply.replies.length > 0 && (
            <div>{renderReplies(reply.replies, replyPath, level + 1, replyId)}</div>
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
                    <div dangerouslySetInnerHTML={{ __html: thread.content }} />
                    <div className="flex gap-2 text-sm">
                      <button className="hover:text-blue-600" onClick={() => handleSend(index)} title="Reply">↩</button>
                      <button className="hover:text-green-600" onClick={() => handleEdit(threadPath)} title="Edit">✎</button>
                      <button className="hover:text-gray-500" onClick={() => toggleCollapse(threadId)} title="Collapse / Expand">{isCollapsed ? "▶" : "▼"}</button>
                    </div>
                  </div>
                  {!isCollapsed && thread.replies && thread.replies.length > 0 && renderReplies(thread.replies, threadPath, 1, threadId)}
                </div>
              );
            })
          ) : html ? (
            <div dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <div className="text-slate-400">No content yet — start typing or paste formatted text.</div>
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
          placeholder={placeholder}
          style={{ whiteSpace: "pre-wrap" }}
        />

        <div className="absolute right-3 bottom-3 flex items-center gap-2">
          <label
            className={`cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded ${
              uploading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            📎
            <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
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
