"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

type QuestionRow = {
  id: string;
  video_id: string;
  asker_name: string;
  question_text: string;
  created_at: string;
};

type AnswerRow = {
  id: string;
  question_id: string;
  answerer_name: string;
  is_staff_answer: boolean;
  answer_text: string;
  created_at: string;
};

type PlaylistLookup = { id: number; title: string; course_id: number };
type CourseLookup = { id: number; name: string };

// video_id مش رقم بسيط (نص مركّب زي "row-12" أو "45-dQw4w9WgXcQ" — نفس
// صيغة content_id في ميزة الملاحظات الشخصية)، فبنستخرج رقم صف الـ playlist
// منه عشان نوريّ الأدمن سياق السؤال (المادة/القائمة) بدل معرّف مبهم.
function resolveVideoContext(
  videoId: string,
  playlists: PlaylistLookup[],
  courses: CourseLookup[]
): string {
  const rowIdStr = videoId.startsWith("row-") ? videoId.slice(4) : videoId.split("-")[0];
  const rowId = Number(rowIdStr);
  if (!Number.isFinite(rowId)) return videoId;

  const playlist = playlists.find((p) => p.id === rowId);
  if (!playlist) return videoId;

  const course = courses.find((c) => c.id === playlist.course_id);
  return course ? `${course.name} — ${playlist.title}` : playlist.title;
}

export default function QaModerationTab({ supabase }: { supabase: SupabaseClient }) {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [answersByQuestion, setAnswersByQuestion] = useState<Map<string, AnswerRow[]>>(new Map());
  const [playlists, setPlaylists] = useState<PlaylistLookup[]>([]);
  const [courses, setCourses] = useState<CourseLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    const [questionsRes, answersRes, playlistsRes, coursesRes] = await Promise.all([
      supabase
        .from("video_questions")
        .select("id, video_id, asker_name, question_text, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("video_answers")
        .select("id, question_id, answerer_name, is_staff_answer, answer_text, created_at")
        .order("created_at", { ascending: false })
        .limit(300),
      supabase.from("playlists").select("id, title, course_id"),
      supabase.from("courses").select("id, name"),
    ]);

    setQuestions((questionsRes.data ?? []) as QuestionRow[]);
    setPlaylists((playlistsRes.data ?? []) as PlaylistLookup[]);
    setCourses((coursesRes.data ?? []) as CourseLookup[]);

    const grouped = new Map<string, AnswerRow[]>();
    for (const answer of (answersRes.data ?? []) as AnswerRow[]) {
      const list = grouped.get(answer.question_id) ?? [];
      list.push(answer);
      grouped.set(answer.question_id, list);
    }
    setAnswersByQuestion(grouped);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDeleteQuestion(questionId: string) {
    if (!window.confirm("متأكد إنك عايز تحذف السؤال ده وكل الردود عليه؟")) return;
    setBusyId(questionId);
    const { error } = await supabase.from("video_questions").delete().eq("id", questionId);
    setBusyId(null);

    if (error) {
      alert(`فشل حذف السؤال: ${error.message}`);
      return;
    }
    loadAll();
  }

  async function handleDeleteAnswer(answerId: string) {
    if (!window.confirm("متأكد إنك عايز تحذف الرد ده؟")) return;
    setBusyId(answerId);
    const { error } = await supabase.from("video_answers").delete().eq("id", answerId);
    setBusyId(null);

    if (error) {
      alert(`فشل حذف الرد: ${error.message}`);
      return;
    }
    loadAll();
  }

  if (loading) {
    return <p className="text-sm text-muted">جارٍ التحميل...</p>;
  }

  if (questions.length === 0) {
    return (
      <div className="rounded-2xl border border-subtle bg-card p-6 text-center text-sm text-muted shadow-sm">
        لا توجد أسئلة حتى الآن
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {questions.map((question) => {
        const answers = answersByQuestion.get(question.id) ?? [];
        return (
          <div key={question.id} className="rounded-2xl border border-subtle bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted">
                  {resolveVideoContext(question.video_id, playlists, courses)}
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">{question.asker_name}</p>
                <p className="mt-1 text-sm text-ink">{question.question_text}</p>
                <p className="mt-1 text-xs text-muted">
                  {new Date(question.created_at).toLocaleString("ar-EG")}
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === question.id}
                onClick={() => handleDeleteQuestion(question.id)}
                className="shrink-0 text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
              >
                حذف السؤال
              </button>
            </div>

            {answers.length > 0 && (
              <div className="mt-4 flex flex-col gap-2 border-t border-subtle pt-3">
                {answers.map((answer) => (
                  <div
                    key={answer.id}
                    className="flex items-start justify-between gap-3 rounded-xl bg-panel p-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-ink">{answer.answerer_name}</p>
                        {answer.is_staff_answer && (
                          <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold">
                            إجابة رسمية
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-ink">{answer.answer_text}</p>
                    </div>
                    <button
                      type="button"
                      disabled={busyId === answer.id}
                      onClick={() => handleDeleteAnswer(answer.id)}
                      className="shrink-0 text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
