"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { savePhoto, removePhoto } from "./actions";

type Kind = "avatar" | "cover";

/** Crop (square for avatars) and shrink in the browser before uploading. */
async function prepare(file: File, kind: Kind): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  let sx = 0;
  let sy = 0;
  let sw = bmp.width;
  let sh = bmp.height;
  if (kind === "avatar") {
    const s = Math.min(sw, sh);
    sx = (sw - s) / 2;
    sy = (sh - s) / 2;
    sw = s;
    sh = s;
  } else {
    // 4:1 banner, centred
    const targetH = Math.min(sh, Math.round(sw / 4));
    sy = (sh - targetH) / 2;
    sh = targetH;
  }
  const max = kind === "avatar" ? 512 : 1600;
  const scale = Math.min(1, max / Math.max(sw, sh));
  const w = Math.round(sw * scale);
  const h = Math.round(sh * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx == null) throw new Error("Your browser could not process this image.");
  ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process this image."))), "image/jpeg", 0.86)
  );
}

export default function PhotoUploader({
  authUserId,
  name,
  avatarUrl,
  coverUrl,
}: {
  authUserId: string;
  name: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
}) {
  const router = useRouter();
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ avatar?: string; cover?: string }>({});
  const [, startTransition] = useTransition();

  async function upload(kind: Kind, file: File | undefined) {
    if (file == null) return;
    setError(null);
    if (/^image\/(jpeg|png|webp)$/.test(file.type) === false) {
      setError("Please choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("That image is over 15 MB. Please choose a smaller one.");
      return;
    }
    setBusy(kind);
    try {
      const blob = await prepare(file, kind);
      setPreview((p) => ({ ...p, [kind]: URL.createObjectURL(blob) }));
      const supabase = createClient();
      const path = `${authUserId}/${kind}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true, cacheControl: "31536000" });
      if (upErr) throw new Error(upErr.message);
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const res = await savePhoto(kind, data.publicUrl);
      if (res.ok === false) throw new Error(res.error);
      startTransition(() => router.refresh());
    } catch (e) {
      setPreview((p) => ({ ...p, [kind]: undefined }));
      const msg = e instanceof Error ? e.message : "Upload failed.";
      setError(/bucket/i.test(msg) ? "Photo storage isn't set up yet (run migration 0015)." : msg);
    } finally {
      setBusy(null);
    }
  }

  async function remove(kind: Kind) {
    setError(null);
    setBusy(kind);
    const res = await removePhoto(kind);
    setBusy(null);
    if (res.ok === false) {
      setError(res.error);
      return;
    }
    setPreview((p) => ({ ...p, [kind]: undefined }));
    startTransition(() => router.refresh());
  }

  const shownCover = preview.cover ?? coverUrl;
  const shownAvatar = preview.avatar ?? avatarUrl;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
      {/* Cover */}
      <div className="group relative h-36 bg-ink md:h-44">
        {shownCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shownCover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div aria-hidden className="bg-dots-light absolute inset-0 opacity-50" />
        )}
        <div className="absolute right-3 top-3 flex gap-2">
          <button
            type="button"
            onClick={() => coverInput.current?.click()}
            disabled={busy != null}
            className="rounded-full bg-white/90 px-3 py-1.5 text-[12px] font-medium text-ink shadow-card backdrop-blur hover:bg-white disabled:opacity-60"
          >
            {busy === "cover" ? "Uploading…" : shownCover ? "Change cover" : "Add cover photo"}
          </button>
          {shownCover && (
            <button
              type="button"
              onClick={() => remove("cover")}
              disabled={busy != null}
              className="rounded-full bg-white/90 px-3 py-1.5 text-[12px] font-medium text-text-secondary shadow-card hover:text-danger disabled:opacity-60"
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={coverInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            upload("cover", e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {/* Avatar */}
      <div className="flex flex-col gap-4 px-5 pb-5 md:flex-row md:items-end md:px-6">
        <div className="relative -mt-12 w-fit">
          <Avatar name={name} url={shownAvatar} size={104} className="border-4 border-white shadow-card" />
          {busy === "avatar" && (
            <span className="absolute inset-1 flex items-center justify-center rounded-full bg-ink/50 text-[12px] font-medium text-white">
              Uploading{"…"}
            </span>
          )}
        </div>
        <div className="flex-1 md:pb-1">
          <p className="text-[15px] font-semibold text-ink">Profile photo</p>
          <p className="text-[13px] text-text-secondary">
            A clear, friendly photo helps mentors and recruiters recognise you. JPG, PNG or WebP.
          </p>
        </div>
        <div className="flex gap-2 md:pb-1">
          <button
            type="button"
            onClick={() => avatarInput.current?.click()}
            disabled={busy != null}
            className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white hover:bg-ink-700 disabled:opacity-60"
          >
            {shownAvatar ? "Change photo" : "Upload photo"}
          </button>
          {shownAvatar && (
            <button
              type="button"
              onClick={() => remove("avatar")}
              disabled={busy != null}
              className="rounded-full border border-ink/15 bg-white px-4 py-2 text-[13px] font-medium text-ink hover:border-danger/40 hover:text-danger disabled:opacity-60"
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={avatarInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            upload("avatar", e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p role="alert" className="border-t border-border bg-danger/5 px-5 py-3 text-[13px] text-danger md:px-6">
          {error}
        </p>
      )}
    </div>
  );
}
