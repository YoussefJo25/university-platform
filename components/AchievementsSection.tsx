import { createClient } from "@/lib/supabase/server";
import { ACHIEVEMENTS } from "@/lib/achievements";

export default async function AchievementsSection({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_achievements")
    .select("achievement_key")
    .eq("user_id", userId);

  const unlockedKeys = new Set((data ?? []).map((row) => row.achievement_key as string));

  return (
    <div className="rounded-2xl border border-subtle bg-card p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-ink">إنجازاتك</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ACHIEVEMENTS.map((achievement) => {
          const isUnlocked = unlockedKeys.has(achievement.key);
          return (
            <div
              key={achievement.key}
              title={achievement.description}
              className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-colors ${
                isUnlocked ? "border-gold bg-panel" : "border-subtle bg-canvas opacity-50 grayscale"
              }`}
            >
              <span className="text-2xl">{achievement.icon}</span>
              <p className="text-xs font-semibold text-ink">{achievement.title}</p>
              <p className="text-[11px] text-muted">{achievement.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
