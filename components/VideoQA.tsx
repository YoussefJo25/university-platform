"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Question = {
  id: string;
  asker_name: string;
  question_text: string;
  created_at: string;
};

type Answer = {
  id: string;
  question_id: string;
  answerer_name: string;
  is_staff_answer: boolean;
  answer_text: string;
  created_at: string;
};

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMinutes = Math.floor(diffMs / (60 * 1000));

  if (diffMinutes < 1) return "الآن";
  if (diffMinutes < 60) return `من ${diffMinutes} دقيقة`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `من ${diffHours} ساعة`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "أمس";
  if (diffDays < 30) return `من ${diffDays} يوم`;

  return new Date(iso).toLocaleDateString("ar-EG");
}

export default function VideoQA({ videoId }: { videoId: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answersByQuestion, setAnswersByQuestion] = useState<Map<string, Answer[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replySubmittingId, setReplySubmittingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const supabase = createClient();

    const { data: questionsData } = await supabase
      .from("video_questions")
      .select("id, asker_name, question_text, created_at")
      .eq("video_id", videoId)
      .order("created_at", { ascending: false });

    const questionRows = (questionsData ?? []) as Question[];
    setQuestions(questionRows);

    if (questionRows.length > 0) {
      const { data: answersData } = await supabase
        .from("video_answers")
        .select("id, question_id, answerer_name, is_staff_answer, answer_text, created_at")
        .in(
          "question_id",
          questionRows.map((q) => q.id)
        )
        .order("created_at", { ascending: true });

      const grouped = new Map<string, Answer[]>();
      for (const answer of (answersData ?? []) as Answer[]) {
        const list = grouped.get(answer.question_id) ?? [];
        list.push(answer);
        grouped.set(answer.question_id, list);
      }
      setAnswersByQuestion(grouped);
    } else {
      setAnswersByQuestion(new Map());
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    setExpandedId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = newQuestion.trim();
    if (!trimmed) return;

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("ask_video_question", {
      p_video_id: videoId,
      p_question_text: trimmed,
    });
    setSubmitting(false);

    if (error) {
      alert(`فشل إرسال السؤال: ${error.message}`);
      return;
    }

    setNewQuestion("");
    load();
  }

  async function handleReply(questionId: string) {
    const draft = (replyDrafts[questionId] ?? "").trim();
    if (!draft) return;

    setReplySubmittingId(questionId);
    const supabase = createClient();
    const { error } = await supabase.rpc("post_video_answer", {
      p_question_id: questionId,
      p_answer_text: draft,
    });
    setReplySubmittingId(null);

    if (error) {
      alert(`فشل إرسال الرد: ${error.message}`);
      return;
    }

    setReplyDrafts((prev) => ({ ...prev, [questionId]: "" }));
    load();
  }

  return (
    <div className="rounded-xl border border-subtle bg-panel p-4">
      <p className="text-sm font-semibold text-ink">الأسئلة والأجوبة</p>

      <form onSubmit={handleAsk} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          placeholder="اسأل سؤالاً عن هذا الفيديو..."
          className="flex-1 rounded-lg border border-subtle bg-card px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-gold"
        />
        <button
          type="submit"
          disabled={submitting || !newQuestion.trim()}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-gold text-gold-ink px-4 py-2 text-xs font-semibold shadow-sm transition-transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
        >
          اسأل
        </button>
      </form>

      <div className="mt-4 flex flex-col gap-2">
        {loading ? (
          <p className="text-xs text-muted">جارٍ التحميل...</p>
        ) : questions.length === 0 ? (
          <p className="text-xs text-muted">لا توجد أسئلة بعد — كن أول من يسأل</p>
        ) : (
          questions.map((question) => {
            const answers = answersByQuestion.get(question.id) ?? [];
            const isExpanded = expandedId === question.id;

            return (
              <div key={question.id} className="rounded-lg border border-subtle bg-card p-3">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : question.id)}
                  className="flex w-full flex-col items-start gap-1 text-right"
                >
                  <span className="text-sm font-medium text-ink">{question.question_text}</span>
                  <span className="text-xs text-muted">
                    {question.asker_name} · {formatRelativeTime(question.created_at)} ·{" "}
                    {answers.length} {answers.length === 1 ? "رد" : "ردود"}
                  </span>
                </button>

                {isExpanded && (
                  <div className="mt-3 flex flex-col gap-2 border-t border-subtle pt-3">
                    {answers.map((answer) => (
                      <div key={answer.id} className="rounded-lg bg-panel p-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-ink">
                            {answer.answerer_name}
                          </span>
                          {answer.is_staff_answer && (
                            <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold">
                              إجابة رسمية
                            </span>
                          )}
                          <span className="text-[11px] text-muted">
                            {formatRelativeTime(answer.created_at)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-ink">{answer.answer_text}</p>
                      </div>
                    ))}

                    <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={replyDrafts[question.id] ?? ""}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({ ...prev, [question.id]: e.target.value }))
                        }
                        placeholder="اكتب ردًا..."
                        className="flex-1 rounded-lg border border-subtle bg-panel px-3 py-1.5 text-sm text-ink outline-none transition-colors focus:border-gold"
                      />
                      <button
                        type="button"
                        onClick={() => handleReply(question.id)}
                        disabled={
                          replySubmittingId === question.id ||
                          !(replyDrafts[question.id] ?? "").trim()
                        }
                        className="shrink-0 rounded-full border border-gold px-4 py-1.5 text-xs font-semibold text-gold transition-colors hover:bg-gold hover:text-gold-ink disabled:opacity-60"
                      >
                        رد
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
