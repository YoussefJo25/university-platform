"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const WHATSAPP_GROUP_LINK = process.env.NEXT_PUBLIC_WHATSAPP_GROUP_LINK;
const DISMISSED_KEY = "whatsapp_banner_dismissed";

export default function WhatsappBanner() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // افتراضي true لحد ما نتأكد من localStorage بعد الـ mount (client-only)
  // — يمنع أي وميض (الشريط يظهر لحظة وبعدين يختفي) لو أصلاً كان مقفول قبل كده.
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function checkSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    }

    checkSession();

    try {
      setIsDismissed(localStorage.getItem(DISMISSED_KEY) === "1");
    } catch {
      setIsDismissed(false);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkSession();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  function handleDismiss() {
    setIsDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // localStorage ممكن يكون متقفول (وضع خاص مثلاً) — الشريط هيرجع
      // يظهر تاني بعد الـ refresh بس، مفيش أي تأثير خطير
    }
  }

  if (!isLoggedIn || isDismissed || !WHATSAPP_GROUP_LINK) return null;

  return (
    <div className="flex items-center justify-center gap-3 border-b border-gold/20 bg-[#075E54] px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">
      <span>📱 انضم لجروب المنصة على واتساب</span>
      <a
        href={WHATSAPP_GROUP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full bg-white/15 px-3 py-1 font-semibold transition-colors hover:bg-white/25"
      >
        انضم
      </a>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="إغلاق"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/20"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          className="h-3 w-3"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
