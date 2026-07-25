"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ProfileForm({
  fullName,
  phone,
}: {
  fullName: string;
  phone: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [phoneNumber, setPhoneNumber] = useState(phone);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

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
      .update({ full_name: name.trim(), phone: phoneNumber })
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
