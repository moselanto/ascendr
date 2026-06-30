import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";

const NAV = [
  { href: "/app", label: "Home", icon: "◳" },
  { href: "/app/communities", label: "Communities", icon: "◎" },
  { href: "/app/communities/new", label: "Create", icon: "＋" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();
  const { data: streak } = await supabase
    .from("streaks")
    .select("current_len")
    .eq("user_id", profile.id)
    .maybeSingle();

  const initials =
    (profile.full_name || "Me")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "ME";

  return (
    <div className="grid md:grid-cols-[240px_1fr] min-h-screen">
      <aside className="hidden md:flex flex-col gap-1 border-r border-border bg-card p-4">
        <Link href="/app" className="text-xl font-black px-2 pb-4 pt-1">
          ASCEND<span className="text-primary">R</span>
        </Link>
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-small font-semibold text-text-secondary hover:bg-bg"
          >
            <span className="w-4 text-center">{n.icon}</span>
            {n.label}
          </Link>
        ))}
        <div className="mt-auto flex items-center gap-2 rounded-sm bg-[#ecfdf5] px-3 py-2 text-small font-semibold text-[#047857]">
          🔥 {streak?.current_len ?? 0}-day streak
        </div>
      </aside>

      <div className="flex flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-card px-5 py-3">
          <Link href="/app" className="md:hidden text-lg font-black">
            ASCEND<span className="text-primary">R</span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-small text-text-secondary hidden sm:block">
              {profile.full_name || "Member"}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white text-caption font-bold">
              {initials}
            </div>
            <form action={signOut}>
              <button className="text-caption text-text-secondary hover:text-text">Sign out</button>
            </form>
          </div>
        </header>
        <main className="p-5 md:p-6">{children}</main>
        <nav className="md:hidden sticky bottom-0 flex justify-around border-t border-border bg-card py-2">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="flex flex-col items-center gap-0.5 text-caption font-semibold text-text-secondary">
              <span className="text-lg">{n.icon}</span>
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
