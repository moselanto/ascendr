"use client";

import { useState } from "react";

export function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(email);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      className="inline-flex items-center justify-center rounded-full border border-ink/15 bg-white px-6 py-3 text-[15px] font-medium text-ink transition-colors hover:border-ink/40"
    >
      {copied ? "Copied" : "Copy email address"}
    </button>
  );
}
