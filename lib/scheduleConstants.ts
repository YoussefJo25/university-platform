export type DayOfWeek = 0 | 1 | 2 | 3 | 4;
export type PeriodNumber = 1 | 2 | 3 | 4;

export const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 0, label: "السبت" },
  { value: 1, label: "الأحد" },
  { value: 2, label: "الاثنين" },
  { value: 3, label: "الثلاثاء" },
  { value: 4, label: "الأربعاء" },
];

export const PERIODS: { value: PeriodNumber; label: string; timeRange: string }[] = [
  { value: 1, label: "الفترة 1", timeRange: "9:00 - 11:00" },
  { value: 2, label: "الفترة 2", timeRange: "11:00 - 1:00" },
  { value: 3, label: "الفترة 3", timeRange: "1:00 - 3:00" },
  { value: 4, label: "الفترة 4", timeRange: "3:00 - 5:00" },
];

export const GROUP_NUMBERS = [1, 2, 3, 4] as const;
export type GroupNumber = (typeof GROUP_NUMBERS)[number];

export const SCHEDULE_UNIVERSITY_NAME = "جامعة المنيا الأهلية";

export function dayLabel(day: number): string {
  return DAYS.find((d) => d.value === day)?.label ?? "—";
}

export function periodLabel(period: number): string {
  const found = PERIODS.find((p) => p.value === period);
  return found ? `${found.label} (${found.timeRange})` : "—";
}
