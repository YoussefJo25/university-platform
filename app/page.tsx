import Link from "next/link";
import GradientButton from "@/components/GradientButton";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="bg-gradient-to-l from-navy to-turquoise px-4 py-20 text-center sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-extrabold text-white sm:text-5xl">
            مرحبًا بكم في جامعة المنيا الاهلية
          </h1>
          <p className="mt-4 text-base text-white/90 sm:text-lg">
            منصتكم الإلكترونية الموحدة للمحاضرات والجداول والخدمات الأكاديمية
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-navy shadow-md transition-transform hover:scale-105 hover:shadow-lg"
            >
              ابدأ الآن
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "السنين الدراسية", desc: "تصفح المقررات والمحتوى الخاص بكل سنة دراسية" },
            { title: "تسجيل الدخول", desc: "ادخل إلى حسابك للوصول إلى خدماتك الأكاديمية" },
            { title: "الدعم الفني", desc: "تواصل معنا لأي استفسار أو مشكلة تقنية" },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-navy/10 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <h2 className="text-lg font-bold text-navy">{item.title}</h2>
              <p className="mt-2 text-sm text-navy/70">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <GradientButton href="/login">تسجيل الدخول</GradientButton>
        </div>
      </section>
    </div>
  );
}
