/**
 * Content checks for mentor sources (SECURITY-AUDIT M-4).
 *
 * 1. Files are inspected, not trusted by extension: binary signatures (PDF,
 *    ZIP/Office, images, executables), NUL bytes and a high share of control
 *    or undecodable characters are rejected.
 * 2. Text that tries to instruct the AI ("ignore previous instructions",
 *    "you are now", fake system/assistant turns) is rejected with the exact
 *    phrase, so the mentor can remove it. Retrieved text is also fenced and
 *    labelled as data at answer time (lib/ai.ts), so this is defence in depth.
 */

const SIGNATURES: { name: string; bytes: number[] }[] = [
  { name: "PDF", bytes: [0x25, 0x50, 0x44, 0x46] },
  { name: "ZIP or Office document", bytes: [0x50, 0x4b, 0x03, 0x04] },
  { name: "PNG image", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { name: "JPEG image", bytes: [0xff, 0xd8, 0xff] },
  { name: "GIF image", bytes: [0x47, 0x49, 0x46, 0x38] },
  { name: "Windows program", bytes: [0x4d, 0x5a] },
  { name: "ELF program", bytes: [0x7f, 0x45, 0x4c, 0x46] },
  { name: "GZIP archive", bytes: [0x1f, 0x8b] },
];

export type Check = { ok: true } | { ok: false; error: string };

export function checkFileBytes(buf: Uint8Array): Check {
  for (const sig of SIGNATURES) {
    if (buf.length >= sig.bytes.length && sig.bytes.every((b, i) => buf[i] === b)) {
      return { ok: false, error: `This file is a ${sig.name}, not plain text. Upload a .txt, .md or .csv file, or paste the text.` };
    }
  }
  const sample = buf.subarray(0, Math.min(buf.length, 65536));
  if (sample.includes(0)) return { ok: false, error: "This file contains binary data, not plain text." };
  return { ok: true };
}

const INJECTION: RegExp[] = [
  /ignore (all |any )?(the )?(previous|prior|above|earlier) (instructions|prompts|rules|messages)/i,
  /disregard (all |any )?(the )?(previous|prior|above|earlier|your) (instructions|prompts|rules)/i,
  /forget (all |everything |your )?(previous |prior )?(instructions|rules|training)/i,
  /\byou are now\b/i,
  /\b(new|updated|override) (system )?(instructions|prompt)\s*:/i,
  /\bsystem prompt\b/i,
  /^\s*(system|assistant)\s*:/im,
  /<\/?(system|assistant|source|instructions)>/i,
  /\bdo not (follow|obey) (the|your) (rules|instructions)\b/i,
  /\breveal (your|the) (instructions|prompt|system)\b/i,
];

export function checkText(text: string): Check {
  if (text.length > 2_000_000) return { ok: false, error: "Text too large (max 2 MB)." };
  let bad = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 0xfffd || (c < 32 && c !== 9 && c !== 10 && c !== 13)) bad++;
  }
  if (text.length > 0 && bad / text.length > 0.01) {
    return { ok: false, error: "This doesn't look like readable text. Check the file's encoding (UTF-8) and try again." };
  }
  for (const re of INJECTION) {
    const m = text.match(re);
    if (m) {
      return {
        ok: false,
        error: `This text contains an instruction aimed at the AI ("${m[0].trim().slice(0, 60)}"). Remove it and try again, so the mentor AI only uses your content as reference.`,
      };
    }
  }
  return { ok: true };
}
