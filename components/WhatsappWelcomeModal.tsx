"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const WHATSAPP_GROUP_LINK = process.env.NEXT_PUBLIC_WHATSAPP_GROUP_LINK;

export default function WhatsappWelcomeModal() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("has_seen_whatsapp_modal")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      setUserId(user.id);
      if (profile?.has_seen_whatsapp_modal === false) {
        setIsOpen(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function markSeen() {
    setIsOpen(false);
    if (!userId) return;
    const supabase = createClient();
    await supabase.from("profiles").update({ has_seen_whatsapp_modal: true }).eq("id", userId);
  }

  function handleJoin() {
    if (WHATSAPP_GROUP_LINK) {
      window.open(WHATSAPP_GROUP_LINK, "_blank", "noopener,noreferrer");
    }
    markSeen();
  }

  if (!isOpen || !WHATSAPP_GROUP_LINK) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-sm rounded-2xl border border-gold/30 bg-card p-6 text-center shadow-lg">
        <button
          type="button"
          onClick={markSeen}
          aria-label="إغلاق"
          className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-panel hover:text-ink"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-4 w-4"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <p className="text-lg font-extrabold font-display text-ink">أهلاً بيك في بوصلة 🎓</p>
        <p className="mt-3 text-sm text-muted">
          انضم لجروب المنصة على واتساب عشان توصلك كل التحديثات والإعلانات المهمة
        </p>

        <button
          type="button"
          onClick={handleJoin}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-105"
        >
          انضم للجروب دلوقتي
        </button>

        <button
          type="button"
          onClick={markSeen}
          className="mt-3 text-xs font-medium text-muted transition-colors hover:text-ink hover:underline"
        >
          مش دلوقتي
        </button>
      </div>
    </div>
  );
}
