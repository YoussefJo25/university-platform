export type AchievementKey =
  | "week_streak"
  | "hundred_minutes"
  | "first_step"
  | "ten_sessions"
  | "night_owl";

export type Achievement = {
  key: AchievementKey;
  icon: string;
  title: string;
  description: string;
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    key: "week_streak",
    icon: "🔥",
    title: "أسبوع متواصل",
    description: "نشاط مسجّل 7 أيام متتالية",
  },
  {
    key: "hundred_minutes",
    icon: "⏱️",
    title: "100 دقيقة تركيز",
    description: "اجمع 100 دقيقة بومودورو",
  },
  {
    key: "first_step",
    icon: "📚",
    title: "أول خطوة",
    description: "أكمل أول جلسة بومودورو",
  },
  {
    key: "ten_sessions",
    icon: "🎯",
    title: "10 جلسات",
    description: "أكمل 10 جلسات بومودورو",
  },
  {
    key: "night_owl",
    icon: "🌙",
    title: "مذاكرة ليلية",
    description: "ذاكر بعد منتصف الليل",
  },
];
