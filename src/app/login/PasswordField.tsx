"use client";

import { useState } from "react";

/**
 * Password input with a show/hide toggle. Used on both sign-in and sign-up.
 * Keeps the same name/required/minLength contract as a plain input so the
 * server actions receive the field unchanged.
 */
export default function PasswordField({
  id = "password",
  name = "password",
  placeholder = "At least 6 characters",
  minLength = 6,
  autoComplete = "current-password",
}: {
  id?: string;
  name?: string;
  placeholder?: string;
  minLength?: number;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-border bg-white px-3 py-2.5 pr-16 text-[14px] text-ink outline-none transition-colors placeholder:text-text-secondary/70 focus:border-ink/40"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-[12px] font-medium text-text-secondary hover:text-ink"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
