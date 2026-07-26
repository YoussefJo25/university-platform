"use client";

import { useState, type FormEvent, type MouseEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type ReportIssueButtonProps = {
  courseId: number;
  itemType: "video" | "book";
  itemTitle: string;
  compact?: boolean;
};

const ISSUE_TYPES = [
  { value: "broken_link", label: "رابط معطّل" },
  { value: "wrong_content", label: "محتوى غير صحيح" },
  { value: "other", label: "أخرى" },
];

export default function ReportIssueButton({
  courseId,
  itemType,
  itemTitle,
  compact = false,
}: ReportIssueButtonProps) {
  const [open, setOpen] = useState(false);
  const [issueType, setIssueType] = useState("broken_link");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function openModal(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setOpen(true);
    setSuccess(false);
    setError(null);
    setIssueType("broken_link");
    setDescription("");
  }

  function closeModal() {
    setOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("content_reports").insert({
      course_id: courseId,
      item_type: itemType,
      item_title: itemTitle,
      issue_type: issueType,
      description: description.trim() || null,
      reporter_id: user?.id ?? null,
    });

    setSaving(false);

    if (insertError) {
      setError(`فشل إرسال البلاغ: ${insertError.message}`);
      return;
    }

    setSuccess(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        aria-label={`الإبلاغ عن مشكلة في ${itemTitle}`}
        title="الإبلاغ عن مشكلة"
        className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-red-600"
      >
        <WarningIcon className="h-3.5 w-3.5 shrink-0" />
        {!compact && <span>الإبلاغ عن مشكلة</span>}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-subtle bg-card p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            {success ? (
              <div className="text-center">
                <p className="text-sm font-semibold text-ink">
                  شكرًا لإبلاغك، سيتم المراجعة قريبًا.
                </p>
                <button
                  type="button"
                  onClick={closeModal}
                  className="mt-4 inline-flex items-center justify-center rounded-full bg-gold text-gold-ink px-5 py-2 text-sm font-semibold shadow-sm"
                >
                  إغلاق
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <h2 className="text-base font-bold text-ink">الإبلاغ عن مشكلة</h2>
                <p className="truncate text-xs text-muted">{itemTitle}</p>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">
                    نوع المشكلة
                  </label>
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    className="w-full rounded-xl border border-subtle bg-panel px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-gold"
                  >
                    {ISSUE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">
                    وصف المشكلة (اختياري)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-subtle bg-panel px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-gold"
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-full bg-gold text-gold-ink px-5 py-2 text-sm font-semibold shadow-sm disabled:opacity-60"
                  >
                    {saving ? "جارٍ الإرسال..." : "إرسال البلاغ"}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="text-sm font-medium text-muted hover:text-ink"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}
