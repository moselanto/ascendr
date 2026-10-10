/**
 * Member avatar: the uploaded photo when there is one, otherwise initials on
 * the brand tile. Plain <img> so Supabase Storage URLs need no next/image
 * domain config.
 */
export function Avatar({
  name,
  url,
  size = 40,
  className = "",
  shape = "rounded-full",
}: {
  name: string | null | undefined;
  url?: string | null;
  size?: number;
  className?: string;
  shape?: string;
}) {
  const label = (name || "Member").trim();
  const initials =
    label
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "M";
  const box = { width: size, height: size };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={label} style={box} className={`${shape} shrink-0 bg-surface object-cover ${className}`} />;
  }
  return (
    <span
      aria-hidden
      style={{ ...box, fontSize: Math.max(11, Math.round(size * 0.32)) }}
      className={`${shape} flex shrink-0 items-center justify-center bg-brand-100 font-semibold text-brand-700 ${className}`}
    >
      {initials}
    </span>
  );
}
