"use client";

import { useEffect, type RefObject } from "react";

// بيقفل أي عنصر عايم (dropdown/menu) لما المستخدم يدوس برّه حدوده —
// مستخدم في قائمة "أدوات المذاكرة" في الـ Header وفي قائمة الثلاث نقاط
// بتاعة كل قائمة تاسكات.
export function useClickOutside(ref: RefObject<HTMLElement | null>, onOutsideClick: () => void) {
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutsideClick();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [ref, onOutsideClick]);
}
