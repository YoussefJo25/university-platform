import Link from "next/link";
import GradientButton from "@/components/GradientButton";
import { createClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/siteSettings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    settings,
  ] = await Promise.all([supabase.auth.getUser(), getSiteSettings()]);

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
  }

  const cards = [
    {
      title: "السنين الدراسية",
      desc: "تصفح المقررات والمحتوى الخاص بكل سنة دراسية",
      href: "/academic-years",
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
      <section className="bg-gradient-to-l from-navy to-turquoise px-4 py-20 text-center sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-extrabold text-white sm:text-5xl">
            {user ? `أهلاً بيك يا ${user.email}` : settings.hero_title}
          </h1>
          <p className="mt-4 text-base text-white/90 sm:text-lg">{settings.hero_subtitle}</p>
          <div className="mt-8 flex justify-center">
            <Link
              href={user ? "/academic-years" : "/login"}
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-navy shadow-md transition-transform hover:scale-105 hover:shadow-lg"
            >
              ابدأ الآن
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="rounded-2xl border border-navy/10 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <h2 className="text-lg font-bold text-navy">{item.title}</h2>
              <p className="mt-2 text-sm text-navy/70">{item.desc}</p>
            </Link>
          ))}
        </div>

        {!user && (
          <div className="mt-10 flex justify-center">
            <GradientButton href="/login">تسجيل الدخول</GradientButton>
          </div>
        )}
      </section>
    </div>
  );
}
