import Link from "next/link";

export default function SupportPage() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="bg-gradient-to-l from-navy to-turquoise px-4 py-14 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold text-white sm:text-4xl">الدعم الفني</h1>
        <p className="mt-3 text-sm text-white/90 sm:text-base">
          هنا لمساعدتك في أي استفسار أو مشكلة تقنية تواجهك على المنصة
        </p>
      </section>

      <section className="flex flex-1 items-center justify-center bg-white px-4 py-12 sm:px-6">
        <div className="w-full max-w-md rounded-2xl border border-navy/10 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-bold text-navy">تواصل معنا</h2>
          <p className="mt-3 text-sm leading-7 text-navy/70">
            لو واجهت أي مشكلة تقنية أو عندك استفسار عن المنصة، ابعتلنا على البريد الإلكتروني
            وهنرد عليك في أقرب وقت ممكن.
          </p>

          <a
            href="mailto:support@minia-national.edu.eg"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-gradient-to-l from-navy to-turquoise px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-105 hover:shadow-lg"
          >
            support@minia-national.edu.eg
          </a>

          <p className="mt-4 text-xs text-navy/50">
            * بريد إلكتروني مؤقت لحد ما يتوفر بريد رسمي للدعم الفني
          </p>

          <Link
            href="/"
            className="mt-6 block text-sm font-medium text-navy/60 transition-colors hover:text-navy"
          >
            الرجوع للرئيسية
          </Link>
        </div>
      </section>
    </div>
  );
}
