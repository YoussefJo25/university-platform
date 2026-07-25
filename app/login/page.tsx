"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isLogin) {
      const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
      if (nameParts.length < 2) {
        setError("من فضلك اكتب الاسم كامل (اسم ولقب على الأقل).");
        return;
      }

      if (!/^\d{10,15}$/.test(phone)) {
        setError("رقم الهاتف لازم يكون أرقام فقط، بين 10 و15 رقم.");
        return;
      }
    }

    setLoading(true);

    const supabase = createClient();

    const { error: authError } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName.trim(), phone },
          },
        });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col">
      <section className="bg-panel border-b border-subtle px-4 py-14 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold text-ink sm:text-4xl">
          {isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}
        </h1>
        <p className="mt-3 text-sm text-muted sm:text-base">
          {isLogin
            ? "ادخل ببريدك الإلكتروني وكلمة المرور للوصول إلى حسابك"
            : "أنشئ حسابك للوصول إلى خدمات المنصة"}
        </p>
      </section>

      <section className="flex flex-1 items-center justify-center bg-canvas px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-2xl border border-subtle bg-card p-6 shadow-sm"
          >
            {!isLogin && (
              <div>
                <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-ink">
                  الاسم الكامل
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-subtle bg-card px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-gold"
                  placeholder="الاسم الأول واللقب"
                />
              </div>
            )}

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

            {!isLogin && (
              <div>
                <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-ink">
                  رقم الهاتف
                </label>
                <input
                  id="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-subtle bg-card px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-gold"
                  placeholder="01xxxxxxxxx"
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
                كلمة المرور
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

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex items-center justify-center rounded-full bg-gold text-gold-ink px-6 py-3 text-sm font-semibold shadow-md transition-transform hover:scale-105 hover:shadow-lg disabled:opacity-60 disabled:hover:scale-100"
            >
              {loading ? "جارٍ التحميل..." : isLogin ? "تسجيل الدخول" : "إنشاء حساب"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {isLogin ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}{" "}
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode(isLogin ? "signup" : "login");
              }}
              className="font-semibold text-gold hover:underline"
            >
              {isLogin ? "أنشئ حسابًا جديدًا" : "سجّل الدخول"}
            </button>
          </p>

          <Link
            href="/"
            className="mt-4 block text-center text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            الرجوع للرئيسية
          </Link>
        </div>
      </section>
    </div>
  );
}
