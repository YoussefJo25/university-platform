"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SCHEDULE_UNIVERSITY_NAME } from "@/lib/scheduleConstants";
import type { ScheduleGridSlot } from "@/components/study-tools/ScheduleGrid";

export type GeneralScheduleStatus = "loading" | "no-university" | "unavailable" | "ready";

export type GeneralScheduleSlot = ScheduleGridSlot & { group_number: number };

// بيجيب جدول جامعة/فرقة المستخدم الحالي مرة واحدة بس (كل المجموعات سوا)،
// والتصفية على مجموعة بعينها بتحصل محليًا (filter) — عشان تبديل المجموعة
// من القائمة المنسدلة يبقى فوري بدون أي طلب شبكة جديد.
export function useStudentGeneralSchedule(groupNumber: number) {
  const [status, setStatus] = useState<GeneralScheduleStatus>("loading");
  const [allSlots, setAllSlots] = useState<GeneralScheduleSlot[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setStatus("no-university");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("university_id, year_id")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      if (!profile?.university_id || !profile?.year_id) {
        setStatus("no-university");
        return;
      }

      const { data: university } = await supabase
        .from("universities")
        .select("name")
        .eq("id", profile.university_id)
        .single();

      if (cancelled) return;

      if (university?.name !== SCHEDULE_UNIVERSITY_NAME) {
        setStatus("unavailable");
        return;
      }

      const { data: slots } = await supabase
        .from("general_schedule_slots")
        .select("id, day_of_week, period_number, group_number, course_name, location, instructor_name")
        .eq("university_id", profile.university_id)
        .eq("year_id", profile.year_id);

      if (cancelled) return;

      setAllSlots((slots ?? []) as GeneralScheduleSlot[]);
      setStatus("ready");
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const slotsForGroup = allSlots.filter((s) => s.group_number === groupNumber);

  return { status, slotsForGroup };
}
