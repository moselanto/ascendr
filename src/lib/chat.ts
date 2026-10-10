/** Shared chat types and helpers used by channel chat and direct messages. */

export type AttachmentKind = "image" | "video" | "file";

export type Attachment = {
  url: string;
  name: string;
  type: string;
  size: number;
  kind: AttachmentKind;
};

export type Reaction = { emoji: string; user_id: string };

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "🔥", "👀"];

export const MAX_ATTACHMENTS = 10;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export const ACCEPTED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export function kindOf(mime: string): AttachmentKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "file";
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Count reactions per emoji, in first-used order, and which ones are mine. */
export function groupReactions(reactions: Reaction[], meId: string) {
  const order: string[] = [];
  const counts = new Map<string, number>();
  const mine = new Set<string>();
  reactions.forEach((r) => {
    if (counts.has(r.emoji) === false) order.push(r.emoji);
    counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
    if (r.user_id === meId) mine.add(r.emoji);
  });
  return order.map((emoji) => ({ emoji, count: counts.get(emoji) ?? 0, mine: mine.has(emoji) }));
}

/** Toggle my reaction in a local list (optimistic update). */
export function toggleLocal(reactions: Reaction[], emoji: string, meId: string): Reaction[] {
  const has = reactions.some((r) => r.emoji === emoji && r.user_id === meId);
  return has
    ? reactions.filter((r) => (r.emoji === emoji && r.user_id === meId) === false)
    : [...reactions, { emoji, user_id: meId }];
}

/**
 * Server-side validation for attachments sent with a message. Only files the
 * sender uploaded to their own chat-media folder are accepted.
 */
export function cleanAttachments(raw: unknown, authUserId: string): Attachment[] {
  let list: unknown = raw;
  if (typeof raw === "string") {
    try {
      list = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (Array.isArray(list) === false) return [];
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/chat-media/${authUserId}/`;
  return (list as Record<string, unknown>[])
    .filter((a) => typeof a?.url === "string" && (a.url as string).startsWith(prefix))
    .slice(0, MAX_ATTACHMENTS)
    .map((a) => {
      const type = String(a.type ?? "application/octet-stream").slice(0, 120);
      return {
        url: String(a.url),
        name: String(a.name ?? "file").slice(0, 200),
        type,
        size: Math.max(0, Number(a.size) || 0),
        kind: kindOf(type),
      };
    });
}
