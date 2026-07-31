"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type CompassMessageState = {
  loading: boolean;
  // null يعني: لسه بيحمّل، أو المستخدم مش مسجل دخول (الكارت مايظهرش خالص)
  message: string | null;
};

export const INACTIVITY_MESSAGE = "من فترة ما شفناكش هنا، وقتك دلوقتي؟ 🧭";
export const WEEK_STREAK_MESSAGE = "أسبوع كامل من الاستمرارية، الاستمرارية دي هي اللي بتفرق فعلاً 🔥";
export const ACHIEVEMENT_TODAY_MESSAGE = "مبروك، فتحت إنجاز جديد النهاردة 🎉";
export const ACTIVE_TODAY_MESSAGE = "شغل حلو النهاردة، كمّل كده";
export const DEFAULT_MESSAGE = "دلوقتي وقت كويس تبدأ فيه، ولو بربع ساعة بس";

export type ActivityRow = { activity_date: string; pomodoro_minutes: number; sessions_count: number };

export function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function daysBetween(later: Date, earlier: Date): number {
  return Math.round((later.getTime() - earlier.getTime()) / (24 * 60 * 60 * 1000));
}

// بيحسب عدد الأيام المتتالية اللي فيها نشاط، بالرجوع للخلف بدءًا من آخر
// يوم فعليًا فيه نشاط (مش بالضرورة النهاردة — لو آخر نشاط كان إمبارح
// والاستمرارية قبلها متصلة، لسه بنعتبرها استمرارية قايمة لحد النهاردة).
export function computeStreak(activityDates: Set<string>, mostRecentDate: Date): number {
  let streak = 0;
  const cursor = new Date(mostRecentDate);
  while (activityDates.has(formatDateOnly(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

// المنطق الصافي (pure) اللي بيحدد الرسالة، منفصل عن أي fetch — عشان يتقدر
// يتفحص بمدخلات محكومة (unit test) لكل حالة من الست حالات بدقة، بدل ما
// نعتمد على جلسة Supabase حقيقية لاختبار كل شرط.
export function resolveCompassMessage(
  rows: ActivityRow[],
  todayStr: string,
  hasAchievementToday: boolean,
  hasCompletedTaskToday: boolean
): string {
  // 6) مفيش نشاط خالص من الأول (حساب جديد) — نفس فلسفة
  // check_inactivity_reminder، مش نفس حالة "غايب 3 أيام".
  if (rows.length === 0) {
    return DEFAULT_MESSAGE;
  }

  const dateSet = new Set(rows.map((r) => r.activity_date));
  const sortedDesc = [...rows].sort((a, b) => (a.activity_date < b.activity_date ? 1 : -1));
  const mostRecentDate = parseDateOnly(sortedDesc[0].activity_date);
  const today = parseDateOnly(todayStr);
  const daysSinceLastActivity = daysBetween(today, mostRecentDate);

  // 1) عدم نشاط 3 أيام أو أكتر
  if (daysSinceLastActivity >= 3) {
    return INACTIVITY_MESSAGE;
  }

  const streak = computeStreak(dateSet, mostRecentDate);

  // 2) استمرارية 7 أيام متتالية أو أكتر
  if (streak >= 7) {
    return WEEK_STREAK_MESSAGE;
  }

  // 3) استمرارية 3-6 أيام متتالية
  if (streak >= 3) {
    return `كملت ${streak} أيام متتالية، كمّل بنفس الروح`;
  }

  // 4) بادچ جديد اتفتح النهاردة
  if (hasAchievementToday) {
    return ACHIEVEMENT_TODAY_MESSAGE;
  }

  // 5) فيه نشاط النهاردة بالفعل (بومودورو أو تاسك مكتمل)
  const todayRow = rows.find((r) => r.activity_date === todayStr);
  const hasPomodoroToday = (todayRow?.pomodoro_minutes ?? 0) > 0 || (todayRow?.sessions_count ?? 0) > 0;

  if (hasPomodoroToday || hasCompletedTaskToday) {
    return ACTIVE_TODAY_MESSAGE;
  }

  // 6) لسه مفيش نشاط النهاردة
  return DEFAULT_MESSAGE;
}

export function useTodaysCompassMessage(): CompassMessageState {
  const [state, setState] = useState<CompassMessageState>({ loading: true, message: null });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setState({ loading: false, message: null });
        return;
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      const todayStartISO = `${todayStr}T00:00:00.000Z`;
      const todayEndISO = new Date(new Date(todayStartISO).getTime() + 24 * 60 * 60 * 1000).toISOString();

      const [{ data: activityRows }, { data: achievementsToday }, { data: completedTasksToday }] =
        await Promise.all([
          supabase
            .from("daily_activity")
            .select("activity_date, pomodoro_minutes, sessions_count")
            .eq("user_id", user.id)
            .order("activity_date", { ascending: false })
            .limit(30),
          supabase
            .from("user_achievements")
            .select("id")
            .eq("user_id", user.id)
            .gte("unlocked_at", todayStartISO)
            .lt("unlocked_at", todayEndISO)
            .limit(1),
          supabase
            .from("tasks")
            .select("id")
            .eq("user_id", user.id)
            .eq("is_completed", true)
            .gte("completed_at", todayStartISO)
            .lt("completed_at", todayEndISO)
            .limit(1),
        ]);

      if (cancelled) return;

      const message = resolveCompassMessage(
        (activityRows ?? []) as ActivityRow[],
        todayStr,
        (achievementsToday ?? []).length > 0,
        (completedTasksToday ?? []).length > 0
      );

      setState({ loading: false, message });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
