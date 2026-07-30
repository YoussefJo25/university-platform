import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/ProfileForm";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import AchievementsSection from "@/components/AchievementsSection";
import { roleLabel } from "@/lib/roles";

export const dynamic = "force-dynamic";

type Profile = {
  full_name: string | null;
  email: string;
  phone: string | null;
  role: string;
  created_at: string;
  university_id: number | null;
  year_id: number | null;
};
type UniversityOption = { id: number; name: string };
type YearOption = { id: number; name: string; university_id: number | null };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // حماية إضافية جوه الصفحة نفسها بجانب proxy.ts (زي ما موصى بيه رسميًا،
  // عشان أي تعديل مستقبلي في proxy.ts ميكسرش الحماية من غير ما حد يلاحظ)
  if (!user) {
    redirect("/login");
  }

  const [{ data: profileData }, { data: universitiesData }, { data: yearsData }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, email, phone, role, created_at, university_id, year_id")
        .eq("id", user.id)
        .single(),
      supabase.from("universities").select("id, name").order("order_index"),
      supabase.from("years").select("id, name, university_id").order("year_number"),
    ]);

  const profile = profileData as Profile | null;
  const universities = (universitiesData ?? []) as UniversityOption[];
  const years = (yearsData ?? []) as YearOption[];

  const universityName = universities.find((u) => u.id === profile?.university_id)?.name;
  const yearName = years.find((y) => y.id === profile?.year_id)?.name;

  const createdAt = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="flex flex-1 flex-col">
      <section className="bg-panel border-b border-subtle px-4 py-14 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold font-display text-ink sm:text-4xl">حسابي</h1>
        <p className="mt-3 text-sm text-muted sm:text-base">بيانات حسابك على المنصة</p>
      </section>

      <section className="flex-1 bg-canvas px-4 py-12 sm:px-6">
        <div className="mx-auto flex max-w-lg flex-col gap-8">
          <div className="rounded-2xl border border-subtle bg-card p-6 shadow-sm">
            <dl className="flex flex-col gap-4">
              <div>
                <dt className="text-xs font-medium text-muted">البريد الإلكتروني</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">
                  {profile?.email ?? user.email}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted">نوع الحساب</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">
                  {roleLabel(profile?.role)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted">الجامعة</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">{universityName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted">الفرقة الدراسية</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">{yearName ?? "—"}</dd>
              </div>
              {createdAt && (
                <div>
                  <dt className="text-xs font-medium text-muted">تاريخ إنشاء الحساب</dt>
                  <dd className="mt-1 text-sm font-semibold text-ink">{createdAt}</dd>
                </div>
              )}
            </dl>
          </div>

          <AchievementsSection userId={user.id} />

          <ProfileForm
            fullName={profile?.full_name ?? ""}
            phone={profile?.phone ?? ""}
            universityId={profile?.university_id ?? null}
            yearId={profile?.year_id ?? null}
            universities={universities}
            years={years}
          />

          <ChangePasswordForm />
        </div>
      </section>
    </div>
  );
}
