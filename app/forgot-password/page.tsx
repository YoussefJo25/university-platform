"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const supabase = createClient();
    // بنعرض نفس رسالة النجاح سواء الإيميل موجود عندنا أو لأ — ده مقصود
    // لأسباب أمنية (منع أي طرف يكتشف الإيميلات المسجلة عن طريق تجربتها هنا)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    setSubmitted(true);
  }

  return (
    <div className="flex flex-1 flex-col">
      <section className="border-b border-subtle bg-panel px-4 py-14 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold font-display text-ink sm:text-4xl">
          نسيت كلمة المرور؟
        </h1>
        <p className="mt-3 text-sm text-muted sm:text-base">
          اكتب بريدك الإلكتروني وهنبعتلك رابط لتعيين كلمة مرور جديدة
        </p>
      </section>

      <section className="flex flex-1 items-center justify-center bg-canvas px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm">
          {submitted ? (
            <div className="rounded-2xl border border-subtle bg-card p-6 text-center shadow-sm">
              <p className="text-sm leading-7 text-muted">
                لو الإيميل ده مسجل عندنا، هيوصلك رابط لتعيين كلمة مرور جديدة خلال
                دقايق. تأكد من مجلد الـ Spam لو مالقيتوش في الوارد.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 rounded-2xl border border-subtle bg-card p-6 shadow-sm"
            >
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
                  البريد الإلكتروني
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-subtle bg-card px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-gold"
                  placeholder="example@mail.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex items-center justify-center rounded-full bg-gold text-gold-ink px-6 py-3 text-sm font-semibold shadow-md transition-transform hover:scale-105 hover:shadow-lg disabled:opacity-60 disabled:hover:scale-100"
              >
                {loading ? "جارٍ الإرسال..." : "إرسال رابط الاسترجاع"}
              </button>
            </form>
          )}

          <Link
            href="/login"
            className="mt-4 block text-center text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            الرجوع لتسجيل الدخول
          </Link>
        </div>
      </section>
    </div>
  );
}
