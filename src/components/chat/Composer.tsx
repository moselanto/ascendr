"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import EmojiPicker from "./EmojiPicker";
import { ACCEPTED_FILE_TYPES, MAX_ATTACHMENTS, MAX_FILE_BYTES, formatBytes, kindOf, type Attachment } from "@/lib/chat";

type Pending = { id: string; file: File; preview: string | null; progress: "uploading" | "done" | "error"; attachment?: Attachment };

/**
 * Slack-style message composer: multi-line text (Enter sends, Shift+Enter adds a
 * line), emoji picker, and image / video / file attachments uploaded to the
 * sender's own folder in the chat-media bucket.
 */
export default function Composer({
  placeholder,
  onSend,
  onTyping,
}: {
  placeholder: string;
  onSend: (body: string, attachments: Attachment[]) => Promise<boolean>;
  onTyping?: () => void;
}) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<Pending[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [authId, setAuthId] = useState<string | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setAuthId(data.user?.id ?? null));
  }, []);

  // Grow the textarea with its content, up to a limit.
  useEffect(() => {
    const el = areaRef.current;
    if (el == null) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [text]);

  async function addFiles(list: FileList | File[]) {
    setError(null);
    const incoming = Array.from(list).slice(0, MAX_ATTACHMENTS - files.length);
    if (authId == null) {
      setError("Please sign in again to attach files.");
      return;
    }
    for (const file of incoming) {
      if (ACCEPTED_FILE_TYPES.includes(file.type) === false) {
        setError(`${file.name}: this file type isn't supported.`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError(`${file.name} is larger than ${formatBytes(MAX_FILE_BYTES)}.`);
        continue;
      }
      const id = crypto.randomUUID();
      const preview = file.type.startsWith("image/") || file.type.startsWith("video/") ? URL.createObjectURL(file) : null;
      setFiles((prev) => [...prev, { id, file, preview, progress: "uploading" }]);
      const safe = file.name.replace(/[^A-Za-z0-9._-]+/g, "-").slice(-80);
      const path = `${authId}/${id}-${safe}`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage.from("chat-media").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
      if (upErr) {
        setFiles((prev) => prev.map((p) => (p.id === id ? { ...p, progress: "error" } : p)));
        setError(/bucket/i.test(upErr.message) ? "File sharing isn't set up yet (run migration 0018)." : `Upload failed: ${upErr.message}`);
        continue;
      }
      const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
      const attachment: Attachment = { url: data.publicUrl, name: file.name, type: file.type, size: file.size, kind: kindOf(file.type) };
      setFiles((prev) => prev.map((p) => (p.id === id ? { ...p, progress: "done", attachment } : p)));
    }
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((p) => p.id !== id));
  }

  function insertEmoji(e: string) {
    const el = areaRef.current;
    if (el == null) {
      setText((t) => t + e);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + e + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + e.length, start + e.length);
    });
  }

  const uploading = files.some((f) => f.progress === "uploading");
  const ready = files.filter((f) => f.progress === "done" && f.attachment).map((f) => f.attachment as Attachment);
  const canSend = sending === false && uploading === false && (text.trim().length > 0 || ready.length > 0);

  async function submit() {
    if (canSend === false) return;
    setSending(true);
    setError(null);
    const ok = await onSend(text.trim(), ready);
    setSending(false);
    if (ok) {
      setText("");
      files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
      setFiles([]);
    } else {
      setError("Message not sent. Check your connection and try again.");
    }
  }

  return (
    <div
      className={`border-t border-border bg-white p-3 ${dragging ? "ring-2 ring-inset ring-brand-400" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
      }}
    >
      <div className="rounded-xl border border-border focus-within:border-ink/30">
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-border p-2">
            {files.map((f) => (
              <div key={f.id} className="relative h-16 w-16 overflow-hidden rounded-lg border border-border bg-surface">
                {f.preview && f.file.type.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.preview} alt={f.file.name} className="h-full w-full object-cover" />
                ) : f.preview ? (
                  <video src={f.preview} muted className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center p-1 text-center text-[10px] font-medium text-text-secondary">
                    {f.file.name.split(".").pop()?.toUpperCase()}
                  </span>
                )}
                {f.progress === "uploading" && (
                  <span className="absolute inset-0 flex items-center justify-center bg-ink/50 text-[10px] font-medium text-white">Uploading</span>
                )}
                {f.progress === "error" && (
                  <span className="absolute inset-0 flex items-center justify-center bg-danger/70 text-[10px] font-medium text-white">Failed</span>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(f.id)}
                  aria-label={`Remove ${f.file.name}`}
                  className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[11px] text-ink shadow-card"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <textarea
          ref={areaRef}
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onTyping?.();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.shiftKey === false && e.nativeEvent.isComposing === false) {
              e.preventDefault();
              submit();
            }
          }}
          onPaste={(e) => {
            if (e.clipboardData.files.length) {
              e.preventDefault();
              addFiles(e.clipboardData.files);
            }
          }}
          placeholder={placeholder}
          aria-label="Message"
          className="block w-full resize-none bg-transparent px-3 py-2.5 text-[14px] text-ink outline-none placeholder:text-text-secondary/70"
        />
        <div className="flex items-center gap-1 px-2 pb-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Attach photos, videos or files"
            title="Attach photos, videos or files"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[18px] text-text-secondary hover:bg-surface hover:text-ink"
          >
            +
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen((o) => o === false)}
              aria-label="Add emoji"
              title="Add emoji"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[17px] text-text-secondary hover:bg-surface hover:text-ink"
            >
              ☺
            </button>
            {pickerOpen && <EmojiPicker align="left" onClose={() => setPickerOpen(false)} onPick={insertEmoji} />}
          </div>
          <span className="ml-1 hidden text-[11px] text-text-secondary sm:inline">Enter to send · Shift + Enter for a new line</span>
          <button
            type="button"
            onClick={submit}
            disabled={canSend === false}
            className="ml-auto rounded-full bg-ink px-4 py-1.5 text-[13px] font-medium text-white hover:bg-ink-700 disabled:opacity-40"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPTED_FILE_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p role="alert" className="mt-1.5 px-1 text-[12px] text-danger">{error}</p>}
    </div>
  );
}
