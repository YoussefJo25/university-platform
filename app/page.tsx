import Image from "next/image";
import Link from "next/link";
import GradientButton from "@/components/GradientButton";
import { createClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/siteSettings";
import { getLeadershipMembers, ROLE_FALLBACK_TITLE, ROLE_ORDER } from "@/lib/leadership";
import { getDisplayName } from "@/lib/displayName";
import { isStaffRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    settings,
    leadershipMembers,
  ] = await Promise.all([supabase.auth.getUser(), getSiteSettings(), getLeadershipMembers()]);

  const membersByRole = new Map(leadershipMembers.map((member) => [member.role_key, member]));
  const orderedMembers = ROLE_ORDER.map(
    (roleKey) =>
      membersByRole.get(roleKey) ?? {
        id: 0,
        role_key: roleKey,
        name: "",
        title: null,
        bio: null,
        photo_url: null,
        order_index: 0,
      }
  );

  let isAdmin = false;
  let displayName = "";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();
    isAdmin = isStaffRole(profile?.role);
    displayName = getDisplayName(profile?.full_name, user.email);
  }

  const cards = [
    {
      title: "السنين الدراسية",
      desc: "تصفح المقررات والمحتوى الخاص بكل سنة دراسية",
      href: "/universities",
    },
    {
      title: "مسار تعلم البرمجة",
      desc: "تعلم البرمجة خطوة بخطوة عبر مسارات متخصصة",
      href: "/learning-path",
    },
    ...(user
      ? isAdmin
        ? [
            {
              title: "لوحة التحكم",
              desc: "إدارة المواد والكتب وقوائم الفيديوهات",
              href: "/admin",
            },
          ]
        : []
      : [
          {
            title: "تسجيل الدخول",
            desc: "ادخل إلى حسابك للوصول إلى خدماتك الأكاديمية",
            href: "/login",
          },
        ]),
    {
      title: "الدعم الفني",
      desc: "تواصل معنا لأي استفسار أو مشكلة تقنية",
      href: "/support",
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <section className="border-b border-subtle bg-panel px-4 py-24 text-center sm:px-6">
        <div className="mx-auto max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/50 bg-canvas/40 px-4 py-1.5 text-xs font-semibold tracking-wide text-gold">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            المنصة الإلكترونية الرسمية
          </span>
          <h1 className="mt-5 text-3xl font-extrabold text-ink sm:text-5xl">
            {user ? (
              <>
                أهلاً بيك يا <span className="italic text-gold">{displayName}</span>
              </>
            ) : (
              settings.hero_title
            )}
          </h1>
          <p className="mt-4 text-base text-muted sm:text-lg">{settings.hero_subtitle}</p>
          <div className="mt-8 flex justify-center">
            <Link
              href={user ? "/universities" : "/login"}
              className="inline-flex items-center justify-center rounded-full bg-gold px-6 py-3 text-sm font-semibold text-gold-ink shadow-md transition-transform hover:scale-105 hover:shadow-lg"
            >
              ابدأ الآن
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-canvas px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="rounded-2xl border border-subtle bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <h2 className="text-lg font-bold text-ink">{item.title}</h2>
              <p className="mt-2 text-sm text-muted">{item.desc}</p>
            </Link>
          ))}
        </div>

        {!user && (
          <div className="mt-10 flex justify-center">
            <GradientButton href="/login">تسجيل الدخول</GradientButton>
          </div>
        )}
      </section>

      <section className="border-t border-subtle bg-panel px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-extrabold text-ink sm:text-3xl">
            القيادة والفريق
          </h2>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {orderedMembers.map((member) => (
              <div
                key={member.role_key}
                className="flex flex-col items-center gap-4 rounded-2xl border border-subtle bg-card p-6 text-center shadow-sm"
              >
                {member.photo_url ? (
                  <Image
                    src={member.photo_url}
                    alt={member.name || ROLE_FALLBACK_TITLE[member.role_key]}
                    width={96}
                    height={96}
                    className="h-24 w-24 rounded-full object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-gold bg-panel text-3xl font-bold text-gold">
                    {(member.name || "؟").trim().charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-ink">{member.name || "—"}</h3>
                  <p className="mt-1 text-sm font-medium text-gold">
                    {member.title || ROLE_FALLBACK_TITLE[member.role_key]}
                  </p>
                  {member.bio && (
                    <p className="mt-3 text-sm leading-6 text-muted">{member.bio}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {settings.about_university_text && (
            <div className="mt-10 overflow-hidden rounded-2xl border border-subtle bg-card shadow-sm">
              <div className="flex flex-col sm:flex-row">
                {settings.college_building_photo_url && (
                  <div className="relative h-56 w-full shrink-0 sm:h-72 sm:w-1/2">
                    <Image
                      src={settings.college_building_photo_url}
                      alt="مبنى الكلية"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex flex-col justify-center p-6 sm:p-8">
                  <h3 className="text-lg font-bold text-ink">
                    نبذة عن الجامعة
                    {settings.founding_year && ` — تأسست ${settings.founding_year}`}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted">
                    {settings.about_university_text}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
