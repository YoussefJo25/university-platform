"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ContentType = "video" | "book";
type SaveStatus = "idle" | "saving" | "saved";

const AUTO_SAVE_DELAY_MS = 2500;

export default function PersonalNotes({
  contentType,
  contentId,
}: {
  contentType: ContentType;
  contentId: string;
}) {
  const [noteText, setNoteText] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SaveStatus>("idle");

  const debounceRef = useRef<number | null>(null);
  const savedMessageRef = useRef<number | null>(null);

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

      const { data } = await supabase
        .from("personal_notes")
        .select("note_text")
        .eq("user_id", user.id)
        .eq("content_type", contentType)
        .eq("content_id", contentId)
        .maybeSingle();

      if (!cancelled) {
        setNoteText(data?.note_text ?? "");
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [contentType, contentId]);

  // تنظيف أي مؤقّتات معلّقة لو الكومبوننت اتشال من الشاشة (زي ما بيحصل
  // فعليًا لما نغيّر الفيديو المختار — key={contentId} في الأب بيعمل
  // remount كامل، فمفيش خطر إن حفظ فيديو قديم يتأخر ويوصل غلط لفيديو تاني).
  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      if (savedMessageRef.current) window.clearTimeout(savedMessageRef.current);
    };
  }, []);

  async function saveNote(value: string) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setStatus("saving");

    await supabase.from("personal_notes").upsert(
      {
        user_id: user.id,
        content_type: contentType,
        content_id: contentId,
        note_text: value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,content_type,content_id" }
    );

    setStatus("saved");
    if (savedMessageRef.current) window.clearTimeout(savedMessageRef.current);
    savedMessageRef.current = window.setTimeout(() => setStatus("idle"), 2500);
  }

  function handleChange(value: string) {
    setNoteText(value);
    setStatus("idle");

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => saveNote(value), AUTO_SAVE_DELAY_MS);
  }

  return (
    <div className="rounded-xl border border-subtle bg-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">ملاحظاتي</p>
        {status === "saving" && <span className="text-xs text-muted">جارٍ الحفظ...</span>}
        {status === "saved" && <span className="text-xs text-emerald-500">تم الحفظ ✓</span>}
      </div>
      <textarea
        value={noteText}
        onChange={(e) => handleChange(e.target.value)}
        disabled={loading}
        placeholder="اكتب ملاحظتك الخاصة هنا... بتتحفظ تلقائيًا"
        rows={4}
        className="mt-2 w-full resize-none rounded-lg border border-subtle bg-card px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-gold disabled:opacity-60"
      />
    </div>
  );
}
