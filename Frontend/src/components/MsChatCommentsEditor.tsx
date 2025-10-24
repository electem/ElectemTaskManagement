import React, { useRef, useState, useEffect } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";

interface MsChatCommentsEditorProps {
  placeholder?: string;
  className?: string;
  value?: string;
  onChange?: (html: string) => void;
  onSend?: (html: string, mediaFiles?: File[]) => void; // send media along with text
}

export default function MsChatCommentsEditor({
  placeholder = "Write a comment...",
  className = "max-w-2xl mx-auto",
  value = "",
  onChange,
  onSend,
}: MsChatCommentsEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [html, setHtml] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    orderedList: false,
    unorderedList: false,
  });

  useEffect(() => {
    if (editorRef.current && value !== html) {
      editorRef.current.innerHTML = value;
      setHtml(value);
    }
  }, [value]);

  useEffect(() => {
    highlightCodeBlocks();
  }, [html]);

  function highlightCodeBlocks() {
    if (!editorRef.current) return;
    const codeBlocks = editorRef.current.querySelectorAll("pre code");
    codeBlocks.forEach((block) => hljs.highlightElement(block as HTMLElement));
  }

  function handleInput() {
    const inner = editorRef.current?.innerHTML || "";
    setHtml(inner);
    onChange?.(inner);
    updateActiveFormats();
  }

  function handleSend() {
    const innerHTML = editorRef.current?.innerHTML || "";
    if (!innerHTML.trim() && mediaFiles.length === 0) return;

    onSend?.(innerHTML, mediaFiles);
    clearEditor();
  }

  function clearEditor() {
    if (editorRef.current) editorRef.current.innerHTML = "";
    setHtml("");
    setMediaFiles([]);
    onChange?.("");
    setActiveFormats({
      bold: false,
      italic: false,
      underline: false,
      orderedList: false,
      unorderedList: false,
    });
  }

  function format(command: "bold" | "italic" | "underline" | "insertOrderedList" | "insertUnorderedList") {
    document.execCommand(command, false);
    handleInput();
  }

  function updateActiveFormats() {
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      orderedList: document.queryCommandState("insertOrderedList"),
      unorderedList: document.queryCommandState("insertUnorderedList"),
    });
  }

  useEffect(() => {
    document.addEventListener("selectionchange", updateActiveFormats);
    return () => document.removeEventListener("selectionchange", updateActiveFormats);
  }, []);

  function triggerFileInput() {
    fileInputRef.current?.click();
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    setMediaFiles(Array.from(e.target.files));
  }

  const buttonClass = (active: boolean) =>
    `px-2 py-1 border rounded hover:bg-gray-100 ${active ? "bg-blue-200" : ""}`;

  return (
    <div className={`${className} flex flex-col gap-2`}>
      {/* Toolbar */}
      <div className="flex gap-2 mb-1 flex-wrap">
        <button type="button" className={buttonClass(activeFormats.bold)} onClick={() => format("bold")} title="Bold">
          <b>B</b>
        </button>
        <button type="button" className={buttonClass(activeFormats.italic)} onClick={() => format("italic")} title="Italic">
          <i>I</i>
        </button>
        <button type="button" className={buttonClass(activeFormats.underline)} onClick={() => format("underline")} title="Underline">
          <u>U</u>
        </button>
        <button type="button" className={buttonClass(activeFormats.unorderedList)} onClick={() => format("insertUnorderedList")} title="Bulleted List">
          • List
        </button>
        <button type="button" className={buttonClass(activeFormats.orderedList)} onClick={() => format("insertOrderedList")} title="Numbered List">
          1. List
        </button>
        <button type="button" className="px-2 py-1 border rounded hover:bg-red-100 text-red-500" onClick={clearEditor} title="Clear">
          Clear
        </button>
        {/* Upload */}
        <button type="button" className="px-2 py-1 border rounded hover:bg-gray-100" onClick={triggerFileInput} title="Upload media">
          📎
        </button>
        <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
      </div>

      {/* Media preview */}
      {mediaFiles.length > 0 && (
        <div className="flex gap-2 overflow-x-auto mb-1">
          {mediaFiles.map((file, idx) => {
            const url = URL.createObjectURL(file);
            if (file.type.startsWith("image")) {
              return <img key={idx} src={url} className="w-24 h-24 object-cover rounded" />;
            } else if (file.type.startsWith("video")) {
              return <video key={idx} src={url} className="w-32 h-24 rounded" controls />;
            }
            return null;
          })}
        </div>
      )}

      {/* Editor */}
      <div className="relative flex items-center border rounded-2xl shadow-sm overflow-hidden bg-white">
        <div
          ref={editorRef}
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          contentEditable
          suppressContentEditableWarning
          className="min-h-[120px] flex-1 p-4 outline-none break-words"
          aria-label="Rich text comment editor"
          style={{ whiteSpace: "pre-wrap", listStylePosition: "inside" }}
        />
        <button onClick={handleSend} className="absolute right-3 bottom-3 bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition" title="Send">
          ➤
        </button>
      </div>

      <style>
        {`
          [contenteditable] ul { list-style-type: disc; margin-left: 20px; }
          [contenteditable] ol { list-style-type: decimal; margin-left: 20px; }
        `}
      </style>
    </div>
  );
}
