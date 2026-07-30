"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";
type UniversityOption = { id: number; name: string };
type YearOption = { id: number; name: string; university_id: number | null };

const OTHER_UNIVERSITY_VALUE = "other";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [universities, setUniversities] = useState<UniversityOption[]>([]);
  const [years, setYears] = useState<YearOption[]>([]);
  const [universityId, setUniversityId] = useState("");
  const [yearId, setYearId] = useState("");
  const [otherUniversityName, setOtherUniversityName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [disabledMessage, setDisabledMessage] = useState(false);

  const isLogin = mode === "login";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("passwordReset") === "1") {
      setResetSuccess(true);
    }
    if (params.get("disabled") === "1") {
      setDisabledMessage(true);
    }
  }, []);

  function yearsForUniversity(uniId: number | string): YearOption[] {
    return years.filter((y) => String(y.university_id) === String(uniId));
  }

  useEffect(() => {
    async function loadOptions() {
      const supabase = createClient();
      const [universitiesRes, yearsRes] = await Promise.all([
        supabase.from("universities").select("id, name").order("order_index"),
        supabase.from("years").select("id, name, university_id, year_number").order("year_number"),
      ]);

      const universitiesData = (universitiesRes.data ?? []) as UniversityOption[];
      const yearsData = (yearsRes.data ?? []) as YearOption[];

      setUniversities(universitiesData);
      setYears(yearsData);

      const firstUniversity = universitiesData[0]?.id ?? "";
      setUniversityId(String(firstUniversity));
      const firstYear = yearsData.find((y) => String(y.university_id) === String(firstUniversity));
      setYearId(firstYear ? String(firstYear.id) : "");
    }

    loadOptions();
  }, []);

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

      if (!universityId || (universityId !== OTHER_UNIVERSITY_VALUE && !yearId)) {
        setError("من فضلك اختر الجامعة والفرقة الدراسية.");
        return;
      }

      if (gender !== "male" && gender !== "female") {
        setError("من فضلك اختر الجنس.");
        return;
      }
    }

    setLoading(true);

    const supabase = createClient();

    const isOtherUniversity = universityId === OTHER_UNIVERSITY_VALUE;

    const { error: authError } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone,
              university_id: isOtherUniversity ? null : Number(universityId),
              year_id: isOtherUniversity ? null : Number(yearId),
              gender,
              other_university_name: isOtherUniversity ? otherUniversityName.trim() || null : null,
            },
          },
        });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (isLogin) {
      // بيتحسب وقت تسجيل الدخول فعليًا (مش مهمة مجدولة خلفية) — الدالة
      // نفسها بتتجاهل الحسابات اللي مالهاش نشاط قبل كده أصلاً (حساب جديد).
      await supabase.rpc("check_inactivity_reminder");
    }

    // تنقل كامل (Hard Navigation) بدل router.push/refresh: لازم نضمن إن
    // الطلب الجاي للسيرفر (وproxy.ts اللي بيتحقق من الجلسة) شايف الكوكيز
    // الجديدة اللي supabase-js لسه بيكتبها. التنقل الداخلي بتاع Next ممكن
    // ينطلق قبل ما الكتابة تخلص، فيرجّع المستخدم لـ /login رغم إن تسجيل
    // الدخول نجح فعلًا (race condition كانت بتحصل مع بعض الحسابات).
    window.location.href = "/";
  }

  return (
    <div className="flex flex-1 flex-col">
      <section className="bg-panel border-b border-subtle px-4 py-14 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold font-display text-ink sm:text-4xl">
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
          {resetSuccess && isLogin && (
            <p className="mb-4 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-center text-sm font-medium text-gold">
              تم تغيير كلمة المرور بنجاح، سجّل دخولك بكلمة المرور الجديدة.
            </p>
          )}

          {disabledMessage && (
            <p className="mb-4 rounded-xl border border-red-600/30 bg-red-600/10 px-4 py-3 text-center text-sm font-medium text-red-600">
              تم تعطيل هذا الحساب. تواصل مع الدعم الفني لو محتاج مساعدة.
            </p>
          )}

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

            {!isLogin && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">الجنس</label>
                <select
                  required
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-xl border border-subtle bg-card px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-gold"
                >
                  <option value="">اختر الجنس</option>
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </div>
            )}

            {!isLogin && (
              <>
                <div>
                  <label
                    htmlFor="university"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    الجامعة
                  </label>
                  <select
                    id="university"
                    required
                    value={universityId}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setUniversityId(nextValue);
                      if (nextValue === OTHER_UNIVERSITY_VALUE) {
                        setYearId("");
                      } else {
                        setOtherUniversityName("");
                        setYearId(yearsForUniversity(nextValue)[0]?.id.toString() ?? "");
                      }
                    }}
                    className="w-full rounded-xl border border-subtle bg-card px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-gold"
                  >
                    {universities.length === 0 && <option value="">جارٍ التحميل...</option>}
                    {universities.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                    <option value={OTHER_UNIVERSITY_VALUE}>أخرى (جامعتي غير موجودة)</option>
                  </select>
                </div>

                <div
                  className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
                    universityId === OTHER_UNIVERSITY_VALUE
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <label
                      htmlFor="otherUniversityName"
                      className="mb-1.5 block text-sm font-medium text-ink"
                    >
                      اكتب اسم جامعتك (اختياري)
                    </label>
                    <input
                      id="otherUniversityName"
                      type="text"
                      value={otherUniversityName}
                      onChange={(e) => setOtherUniversityName(e.target.value)}
                      className="w-full rounded-xl border border-subtle bg-card px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-gold"
                      placeholder="مثال: جامعة القاهرة"
                    />
                  </div>
                </div>

                {universityId !== OTHER_UNIVERSITY_VALUE && (
                  <div>
                    <label htmlFor="year" className="mb-1.5 block text-sm font-medium text-ink">
                      الفرقة الدراسية
                    </label>
                    <select
                      id="year"
                      required
                      value={yearId}
                      onChange={(e) => setYearId(e.target.value)}
                      className="w-full rounded-xl border border-subtle bg-card px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-gold"
                    >
                      {yearsForUniversity(universityId).length === 0 && (
                        <option value="">لا توجد فرق دراسية لهذه الجامعة</option>
                      )}
                      {yearsForUniversity(universityId).map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
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
              {isLogin && (
                <Link
                  href="/forgot-password"
                  className="mt-1.5 inline-block text-sm font-medium text-gold hover:underline"
                >
                  نسيت كلمة المرور؟
                </Link>
              )}
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
