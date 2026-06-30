import { createClient } from "@/lib/supabase/server";

/**
 * Server-side XP + daily streak award. Never trust the client for XP.
 * Call this from server actions after a qualifying action (post, message, comment).
 *
 * - Inserts an xp_events row (audit trail + leaderboard source).
 * - Updates the user's streak: increments if last_active was yesterday,
 *   resets to 1 if older, no-op if already active today.
 */
export async function awardXp(
  profileId: string,
  source: string,
  points: number,
  communityId?: string | null
) {
  const supabase = createClient();

  await supabase.from("xp_events").insert({
    user_id: profileId,
    community_id: communityId ?? null,
    source,
    points,
  });

  const today = new Date().toISOString().slice(0, 10);
  const { data: streak } = await supabase
    .from("streaks")
    .select("*")
    .eq("user_id", profileId)
    .maybeSingle();

  if (!streak) {
    await supabase.from("streaks").insert({
      user_id: profileId,
      current_len: 1,
      longest_len: 1,
      last_active_date: today,
    });
    return;
  }

  if (streak.last_active_date === today) return; // already counted today

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const continued = streak.last_active_date === yesterday;
  const current = continued ? streak.current_len + 1 : 1;
  const longest = Math.max(current, streak.longest_len ?? 0);

  await supabase
    .from("streaks")
    .update({ current_len: current, longest_len: longest, last_active_date: today })
    .eq("user_id", profileId);
}
