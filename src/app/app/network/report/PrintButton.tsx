"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white hover:bg-ink-700 print:hidden"
    >
      Download as PDF
    </button>
  );
}
