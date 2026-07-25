import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/ProfileForm";
import { roleLabel } from "@/lib/roles";

export const dynamic = "force-dynamic";

type Profile = {
  full_name: string | null;
  email: string;
  phone: string | null;
  role: string;
  created_at: string;
};

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

  const { data: profileData } = await supabase
    .from("profiles")
    .select("full_name, email, phone, role, created_at")
    .eq("id", user.id)
    .single();

  const profile = profileData as Profile | null;

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
        <h1 className="text-2xl font-extrabold text-ink sm:text-4xl">حسابي</h1>
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
              {createdAt && (
                <div>
                  <dt className="text-xs font-medium text-muted">تاريخ إنشاء الحساب</dt>
                  <dd className="mt-1 text-sm font-semibold text-ink">{createdAt}</dd>
                </div>
              )}
            </dl>
          </div>

          <ProfileForm fullName={profile?.full_name ?? ""} phone={profile?.phone ?? ""} />
        </div>
      </section>
    </div>
  );
}
