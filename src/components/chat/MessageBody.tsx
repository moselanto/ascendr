import { Fragment } from "react";
import { formatBytes, type Attachment } from "@/lib/chat";

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:)"'\]])/g;

/** YouTube video id from a watch, short or youtu.be link. */
function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

/** Message text with clickable links, emoji-only messages shown large, and YouTube previews. */
export function MessageText({ body }: { body: string | null }) {
  const text = (body ?? "").trim();
  if (text.length === 0) return null;
  const emojiOnly = /^(\p{Extended_Pictographic}|\p{Emoji_Component}|\u200d|\ufe0f|\s){1,12}$/u.test(text) && /\p{Extended_Pictographic}/u.test(text);
  const parts = text.split(URL_RE);
  const videos = Array.from(new Set((text.match(URL_RE) ?? []).map(youtubeId).filter((v): v is string => Boolean(v)))).slice(0, 2);
  return (
    <>
      <p className={`whitespace-pre-wrap break-words ${emojiOnly ? "text-[34px] leading-tight" : "text-[14px] leading-relaxed text-ink"}`}>
        {parts.map((p, i) =>
          i % 2 === 1 ? (
            <a key={i} href={p} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-600 underline-offset-2 hover:underline">
              {p}
            </a>
          ) : (
            <Fragment key={i}>{p}</Fragment>
          )
        )}
      </p>
      {videos.map((id) => (
        <div key={id} className="mt-2 aspect-video w-full max-w-[420px] overflow-hidden rounded-xl border border-border bg-ink">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}`}
            title="YouTube video"
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      ))}
    </>
  );
}

/** Images as a grid, videos with a player, other files as download cards. */
export function MessageAttachments({ items }: { items: Attachment[] | null | undefined }) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return null;
  const images = list.filter((a) => a.kind === "image");
  const videos = list.filter((a) => a.kind === "video");
  const files = list.filter((a) => a.kind === "file");
  return (
    <div className="mt-2 space-y-2">
      {images.length > 0 && (
        <div className={`grid max-w-[460px] gap-1.5 ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {images.map((a) => (
            <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-border bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={a.name} loading="lazy" className={`w-full object-cover ${images.length > 1 ? "h-40" : "max-h-80"}`} />
            </a>
          ))}
        </div>
      )}
      {videos.map((a) => (
        <video key={a.url} src={a.url} controls preload="metadata" className="w-full max-w-[460px] rounded-xl border border-border bg-ink" />
      ))}
      {files.map((a) => (
        <a
          key={a.url}
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex max-w-[360px] items-center gap-3 rounded-xl border border-border bg-white px-3 py-2.5 hover:border-ink/30"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-[11px] font-semibold uppercase text-brand-700">
            {(a.name.split(".").pop() ?? "file").slice(0, 4)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-ink">{a.name}</span>
            <span className="block text-[11px] text-text-secondary">{formatBytes(a.size)} · Download</span>
          </span>
        </a>
      ))}
    </div>
  );
}
