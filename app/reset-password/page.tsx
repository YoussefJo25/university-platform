"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("كلمة المرور لازم تكون 6 أحرف على الأقل.");
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمتا المرور مش متطابقتين.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    window.location.href = "/login?passwordReset=1";
  }

  return (
    <div className="flex flex-1 flex-col">
      <section className="border-b border-subtle bg-panel px-4 py-14 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold font-display text-ink sm:text-4xl">
          تعيين كلمة مرور جديدة
        </h1>
        <p className="mt-3 text-sm text-muted sm:text-base">اكتب كلمة المرور الجديدة لحسابك</p>
      </section>

      <section className="flex flex-1 items-center justify-center bg-canvas px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-2xl border border-subtle bg-card p-6 shadow-sm"
          >
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
                كلمة المرور الجديدة
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-subtle bg-card px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-gold"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                تأكيد كلمة المرور
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-subtle bg-card px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-gold"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex items-center justify-center rounded-full bg-gold text-gold-ink px-6 py-3 text-sm font-semibold shadow-md transition-transform hover:scale-105 hover:shadow-lg disabled:opacity-60 disabled:hover:scale-100"
            >
              {loading ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
