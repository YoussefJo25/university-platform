"use client";

import { useState } from "react";
import ScheduleGrid from "@/components/study-tools/ScheduleGrid";
import { GROUP_NUMBERS } from "@/lib/scheduleConstants";
import { useStudentGeneralSchedule } from "@/hooks/useStudentGeneralSchedule";

export default function GeneralScheduleView() {
  const [groupNumber, setGroupNumber] = useState(1);
  const { status, slotsForGroup } = useStudentGeneralSchedule(groupNumber);

  if (status === "loading") {
    return <p className="py-10 text-center text-sm text-muted">جارٍ التحميل...</p>;
  }

  if (status === "no-university") {
    return (
      <div className="rounded-2xl border border-subtle bg-card p-8 text-center text-sm text-muted shadow-sm">
        من فضلك حدّد جامعتك وفرقتك من صفحة حسابك أولاً.
      </div>
    );
  }

  if (status === "unavailable") {
    return (
      <div className="rounded-2xl border border-subtle bg-card p-8 text-center text-sm text-muted shadow-sm">
        جدول جامعتك لسه مش متاح.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <label htmlFor="group-select" className="text-sm font-medium text-ink">
          مجموعتك:
        </label>
        <select
          id="group-select"
          value={groupNumber}
          onChange={(e) => setGroupNumber(Number(e.target.value))}
          className="rounded-lg border border-subtle bg-card px-3 py-1.5 text-sm text-ink outline-none focus:border-gold"
        >
          {GROUP_NUMBERS.map((g) => (
            <option key={g} value={g}>
              مجموعة {g}
            </option>
          ))}
        </select>
      </div>

      <ScheduleGrid slots={slotsForGroup} emptyMessage="لا توجد حصص مضافة لمجموعتك حتى الآن" />
    </div>
  );
}
