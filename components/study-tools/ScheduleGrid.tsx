import { Fragment, type ReactNode } from "react";
import { DAYS, PERIODS } from "@/lib/scheduleConstants";

export type ScheduleGridSlot = {
  id: string;
  day_of_week: number;
  period_number: number;
  course_name: string;
  location: string | null;
  instructor_name: string | null;
  color_tag?: string | null;
};

export default function ScheduleGrid({
  slots,
  renderActions,
  emptyMessage = "مفيش حصص مضافة لسه",
}: {
  slots: ScheduleGridSlot[];
  renderActions?: (slot: ScheduleGridSlot) => ReactNode;
  emptyMessage?: string;
}) {
  function findSlot(day: number, period: number): ScheduleGridSlot | undefined {
    return slots.find((s) => s.day_of_week === day && s.period_number === period);
  }

  function SlotCard({ slot }: { slot: ScheduleGridSlot }) {
    return (
      <div
        className="group relative flex h-full flex-col gap-0.5 rounded-lg border border-subtle bg-panel p-2.5"
        style={slot.color_tag ? { borderInlineStartWidth: 3, borderInlineStartColor: slot.color_tag } : undefined}
      >
        <p className="text-xs font-semibold text-ink">{slot.course_name}</p>
        {slot.location && <p className="text-[11px] text-muted">📍 {slot.location}</p>}
        {slot.instructor_name && <p className="text-[11px] text-muted">👤 {slot.instructor_name}</p>}
        {renderActions && (
          <div className="mt-1 flex items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100">
            {renderActions(slot)}
          </div>
        )}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-2xl border border-subtle bg-card p-8 text-center text-sm text-muted shadow-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* شاشات كبيرة: Grid أسبوعي (5 أيام × 4 فترات) */}
      <div className="hidden overflow-x-auto rounded-2xl border border-subtle bg-card p-3 shadow-sm sm:block">
        <div className="grid min-w-[720px] grid-cols-[100px_repeat(5,1fr)] gap-2">
          <div />
          {DAYS.map((day) => (
            <div key={day.value} className="px-2 py-2 text-center text-sm font-semibold text-ink">
              {day.label}
            </div>
          ))}

          {PERIODS.map((period) => (
            <Fragment key={period.value}>
              <div className="flex flex-col items-center justify-center rounded-lg bg-panel px-2 py-3 text-center">
                <span className="text-xs font-semibold text-ink">{period.label}</span>
                <span className="text-[10px] text-muted">{period.timeRange}</span>
              </div>
              {DAYS.map((day) => {
                const slot = findSlot(day.value, period.value);
                return (
                  <div key={`${day.value}-${period.value}`} className="min-h-[72px]">
                    {slot ? <SlotCard slot={slot} /> : null}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {/* الموبايل: قائمة عمودية مقسّمة بعناوين أيام */}
      <div className="flex flex-col gap-4 sm:hidden">
        {DAYS.map((day) => {
          const daySlots = slots
            .filter((s) => s.day_of_week === day.value)
            .sort((a, b) => a.period_number - b.period_number);

          if (daySlots.length === 0) return null;

          return (
            <div key={day.value}>
              <p className="mb-2 text-sm font-bold text-ink">{day.label}</p>
              <div className="flex flex-col gap-2">
                {daySlots.map((slot) => (
                  <div key={slot.id} className="flex items-start gap-2">
                    <span className="mt-2.5 w-16 shrink-0 text-[11px] text-muted">
                      {PERIODS.find((p) => p.value === slot.period_number)?.timeRange}
                    </span>
                    <div className="flex-1">
                      <SlotCard slot={slot} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
