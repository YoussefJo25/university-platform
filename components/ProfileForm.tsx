"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type UniversityOption = { id: number; name: string };
type YearOption = { id: number; name: string; university_id: number | null };

export default function ProfileForm({
  fullName,
  phone,
  universityId,
  yearId,
  universities,
  years,
}: {
  fullName: string;
  phone: string;
  universityId: number | null;
  yearId: number | null;
  universities: UniversityOption[];
  years: YearOption[];
}) {
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [phoneNumber, setPhoneNumber] = useState(phone);
  const [selectedUniversityId, setSelectedUniversityId] = useState<number | string>(
    universityId ?? universities[0]?.id ?? ""
  );
  const [selectedYearId, setSelectedYearId] = useState<number | string>(yearId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  function yearsForUniversity(uniId: number | string): YearOption[] {
    return years.filter((y) => String(y.university_id) === String(uniId));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const nameParts = name.trim().split(/\s+/).filter(Boolean);
    if (nameParts.length < 2) {
      setError("من فضلك اكتب الاسم كامل (اسم ولقب على الأقل).");
      return;
    }

    if (!/^\d{10,15}$/.test(phoneNumber)) {
      setError("رقم الهاتف لازم يكون أرقام فقط، بين 10 و15 رقم.");
      return;
    }

    if (!selectedUniversityId || !selectedYearId) {
      setError("من فضلك اختر الجامعة والفرقة الدراسية.");
      return;
    }

    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setError("انتهت الجلسة، سجّل الدخول تاني.");
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: name.trim(),
        phone: phoneNumber,
        university_id: Number(selectedUniversityId),
        year_id: Number(selectedYearId),
      })
      .eq("id", user.id);

    setSaving(false);

    if (updateError) {
      setError(`فشل الحفظ: ${updateError.message}`);
      return;
    }

    setSuccess(true);
    window.dispatchEvent(new Event("profile-updated"));
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-subtle bg-card p-6 shadow-sm"
    >
      <h2 className="text-lg font-bold text-ink">تعديل البيانات</h2>

      <div>
        <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-ink">
          الاسم الكامل
        </label>
        <input
          id="fullName"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-subtle bg-card px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-gold"
        />
      </div>

      <div>
        <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-ink">
          رقم الهاتف
        </label>
        <input
          id="phone"
          type="tel"
          required
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="w-full rounded-xl border border-subtle bg-card px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-gold"
        />
      </div>

      <div>
        <label htmlFor="university" className="mb-1.5 block text-sm font-medium text-ink">
          الجامعة
        </label>
        <select
          id="university"
          required
          value={selectedUniversityId}
          onChange={(e) => {
            const nextUniId = e.target.value;
            setSelectedUniversityId(nextUniId);
            setSelectedYearId(yearsForUniversity(nextUniId)[0]?.id ?? "");
          }}
          className="w-full rounded-xl border border-subtle bg-card px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-gold"
        >
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="year" className="mb-1.5 block text-sm font-medium text-ink">
          الفرقة الدراسية
        </label>
        <select
          id="year"
          required
          value={selectedYearId}
          onChange={(e) => setSelectedYearId(e.target.value)}
          className="w-full rounded-xl border border-subtle bg-card px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-gold"
        >
          {yearsForUniversity(selectedUniversityId).length === 0 && (
            <option value="">لا توجد فرق دراسية لهذه الجامعة</option>
          )}
          {yearsForUniversity(selectedUniversityId).map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">تم حفظ التعديلات بنجاح.</p>}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center justify-center rounded-full bg-gold text-gold-ink px-6 py-2.5 text-sm font-semibold shadow-sm transition-transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
      >
        {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
      </button>
    </form>
  );
}
