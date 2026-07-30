"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Compass, Download, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ACHIEVEMENTS } from "@/lib/achievements";

type CardFormat = "story" | "square";

// أبعاد العرض على الشاشة (px) + pixelRatio عشان الصورة المصدَّرة تطلع
// بدقة 1080 الحقيقية (270×4=1080 قصة، 270×4=1080×1080 مربّع) من غير ما
// الكارت نفسه ياخد مساحة ضخمة في صفحة البروفايل.
const FORMAT_DESIGN: Record<CardFormat, { width: number; height: number; pixelRatio: number }> = {
  story: { width: 270, height: 480, pixelRatio: 4 },
  square: { width: 270, height: 270, pixelRatio: 4 },
};

// الكارت ده بيتصدّر كصورة (html-to-image)، فألوانه ثابتة (كحلي غامق +
// ذهبي) بالحرف عن طريق inline style بدلاً من utility classes بتعتمد على
// CSS variables/تعديلات الشفافية بتاعة Tailwind v4 (زي bg-gold/10) —
// دي بتتحول لـ color-mix() اللي بعض مكتبات تحويل DOM لصورة (html-to-image/
// html2canvas) لسه بتواجه مشاكل حقيقية في تفسيرها، فبنتجنبها تمامًا جوه
// العنصر اللي بيتصوّر بدل ما نفترض إنها هتشتغل.
const NAVY_BG = "#0c1524";
const GOLD = "#c9a227";
const GOLD_LIGHT = "#e8c766";

type TodayStats = {
  minutesActive: number;
  pomodoroSessions: number;
  completedTasks: number;
  unlockedAchievement: { icon: string; title: string } | null;
};

export default function DailyAchievementCard() {
  const [format, setFormat] = useState<CardFormat>("story");
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // فحص دعم navigator.share بعد الـ mount بس (client-only)، عشان مايحصلش
    // اختلاف بين أول رندر على السيرفر وأول رندر بعد الـ hydration.
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      const todayStartISO = `${todayStr}T00:00:00.000Z`;
      const todayEndISO = new Date(new Date(todayStartISO).getTime() + 24 * 60 * 60 * 1000).toISOString();

      const [{ data: activity }, { data: completedTasks }, { data: achievementsToday }] = await Promise.all([
        supabase
          .from("daily_activity")
          .select("minutes_active, pomodoro_minutes, sessions_count")
          .eq("user_id", user.id)
          .eq("activity_date", todayStr)
          .maybeSingle(),
        supabase
          .from("tasks")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_completed", true)
          .gte("completed_at", todayStartISO)
          .lt("completed_at", todayEndISO),
        supabase
          .from("user_achievements")
          .select("achievement_key, unlocked_at")
          .eq("user_id", user.id)
          .gte("unlocked_at", todayStartISO)
          .lt("unlocked_at", todayEndISO)
          .order("unlocked_at", { ascending: false })
          .limit(1),
      ]);

      if (cancelled) return;

      const unlockedKey = achievementsToday?.[0]?.achievement_key as string | undefined;
      const unlockedConfig = unlockedKey ? ACHIEVEMENTS.find((a) => a.key === unlockedKey) : undefined;

      setStats({
        minutesActive: activity?.minutes_active ?? 0,
        pomodoroSessions: activity?.sessions_count ?? 0,
        completedTasks: completedTasks?.length ?? 0,
        unlockedAchievement: unlockedConfig
          ? { icon: unlockedConfig.icon, title: unlockedConfig.title }
          : null,
      });
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function exportCardImage(): Promise<string | null> {
    if (!cardRef.current) return null;
    return toPng(cardRef.current, { pixelRatio: FORMAT_DESIGN[format].pixelRatio });
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const dataUrl = await exportCardImage();
      if (!dataUrl) return;
      const link = document.createElement("a");
      link.download = `bawsala-daily-achievement-${format}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      alert("حصل خطأ أثناء إنشاء الصورة، حاول تاني.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleShare() {
    try {
      const dataUrl = await exportCardImage();
      if (!dataUrl) return;
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "bawsala-daily-achievement.png", { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "دقيقة إنجازي مع بوصلة" });
      }
    } catch {
      // المستخدم لغى المشاركة أو المتصفح رفض — مفيش داعي نعرض خطأ لحاجة ملهاش تأثير فعلي
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">جارٍ التحميل...</p>;
  }

  if (!stats) return null;

  const design = FORMAT_DESIGN[format];
  const todayLabel = new Date().toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="rounded-2xl border border-subtle bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">دقيقة إنجازك اليوم 🔥</h2>
        <div className="flex rounded-full border border-subtle bg-panel p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setFormat("story")}
            aria-pressed={format === "story"}
            className={`rounded-full px-3 py-1 font-semibold transition-colors ${
              format === "story" ? "bg-gold text-gold-ink" : "text-muted hover:text-ink"
            }`}
          >
            قصة
          </button>
          <button
            type="button"
            onClick={() => setFormat("square")}
            aria-pressed={format === "square"}
            className={`rounded-full px-3 py-1 font-semibold transition-colors ${
              format === "square" ? "bg-gold text-gold-ink" : "text-muted hover:text-ink"
            }`}
          >
            منشور مربّع
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-4">
        <div
          ref={cardRef}
          style={{
            width: design.width,
            height: design.height,
            backgroundColor: NAVY_BG,
            position: "relative",
            overflow: "hidden",
            borderRadius: 16,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            textAlign: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(circle at 50% 0%, rgba(201,162,39,0.22), transparent 60%)`,
            }}
          />
          <Compass
            style={{ position: "absolute", bottom: -24, left: -24, color: "rgba(201,162,39,0.12)" }}
            className="h-32 w-32"
            strokeWidth={1}
          />

          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: GOLD }} className="font-display">
              بوصلة | Bawsala
            </p>
            <p style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: "#ffffff" }}>إنجازك اليوم</p>
          </div>

          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              flex: 1,
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <StatRow value={stats.minutesActive} label="دقيقة مذاكرة" />
            <StatRow value={stats.pomodoroSessions} label="جلسة بومودورو" />
            <StatRow value={stats.completedTasks} label="تاسك مكتمل" />

            {stats.unlockedAchievement && (
              <div
                style={{
                  marginTop: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 9999,
                  backgroundColor: "rgba(201,162,39,0.15)",
                  padding: "4px 12px",
                }}
              >
                <span style={{ fontSize: 16 }}>{stats.unlockedAchievement.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: GOLD_LIGHT }}>
                  {stats.unlockedAchievement.title}
                </span>
              </div>
            )}
          </div>

          <p style={{ position: "relative", zIndex: 1, fontSize: 10, color: "rgba(255,255,255,0.55)" }}>
            {todayLabel}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-semibold text-gold-ink shadow-sm transition-transform hover:scale-105 disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            {downloading ? "جارٍ التجهيز..." : "تحميل الكارت"}
          </button>
          {canShare && (
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-full border border-gold px-4 py-2 text-xs font-semibold text-gold transition-colors hover:bg-gold hover:text-gold-ink"
            >
              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
              مشاركة
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatRow({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
      <span style={{ fontSize: 24, fontWeight: 800, color: "#ffffff" }}>{value}</span>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{label}</span>
    </div>
  );
}
