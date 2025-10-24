// MsChatCommentsEditor.jsx
import React, { useRef, useState, useEffect } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github.css"; // swap theme if you like

export default function MsChatCommentsEditor({
  placeholder = "Write a comment...",
  className = "max-w-2xl mx-auto",
}) {
  const editorRef = useRef(null);
  const [html, setHtml] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = "";
    }
  }, []);

  // re-highlight whenever preview HTML changes
  useEffect(() => {
    highlightCodeBlocks();
  }, [html]);

  function highlightCodeBlocks() {
    if (!editorRef.current) return;
    const codeBlocks = editorRef.current.querySelectorAll("pre code");
    codeBlocks.forEach((block) => {
      hljs.highlightElement(block);
    });
  }

  function detectLanguage(text) {
    const result = hljs.highlightAuto(text);
    return result.language || "plaintext";
  }

  function sanitizeHtml(dirty) {
    if (!dirty) return "";
    const doc = new DOMParser().parseFromString(dirty, "text/html");
    // remove script/style nodes
    doc.querySelectorAll("script,style").forEach((n) => n.remove());
    // remove inline event handlers
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
      // sanitize pasted HTML and keep formatting
      payload = sanitizeHtml(htmlData);
    } else if (textData) {
      // if plain text, detect language and create code blocks per paragraph
      const language = detectLanguage(textData);
      const paragraphs = textData
        .split(/\n{2,}/)
        .map((p) => `<pre><code class="language-${language}">${escapeHtml(p)}</code></pre>`)
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
    // move caret after inserted content
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function wrapSelectionWithCodeBlock() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const selectedText = sel.toString();
    if (!selectedText) return;
    const language = detectLanguage(selectedText);
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.className = `language-${language}`;
    // use textContent to preserve raw text inside code
    code.textContent = selectedText;
    pre.appendChild(code);
    // replace selection with pre>code
    range.deleteContents();
    range.insertNode(pre);
    // put caret after inserted pre
    range.setStartAfter(pre);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    hljs.highlightElement(code);
  }

  function handleKeyDown(e) {
    // Ctrl+C behavior: convert selection into a code block (per your request)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
      // only do the transform when selection has >0 length
      const sel = window.getSelection();
      if (sel && sel.toString().trim()) {
        e.preventDefault();
        wrapSelectionWithCodeBlock();
        syncHtml();
      }
    }
  }

  function handleInput() {
    syncHtml();
  }

  function syncHtml() {
    const inner = editorRef.current ? editorRef.current.innerHTML : "";
    setHtml(inner);
  }

  function handleSend() {
    const innerHTML = editorRef.current?.innerHTML || "";
    // generate HTML and post to preview
    setHtml(innerHTML);
    // optional: you can also emit this HTML to parent via props/callback
  }

  return (
    <div className={`${className} flex flex-col gap-3`}>
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
          data-placeholder={placeholder}
          style={{ whiteSpace: "pre-wrap" }}
        />
        {/* Send arrow */}
        <button
          onClick={handleSend}
          className="absolute right-3 bottom-3 bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition"
          title="Send"
        >
          ➤
        </button>
      </div>
    </div>
  );
}

