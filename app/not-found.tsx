import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-white px-4 py-24 text-center">
      <p className="text-sm font-semibold text-turquoise">404</p>
      <h1 className="mt-2 text-2xl font-extrabold text-navy sm:text-3xl">
        الصفحة غير موجودة
      </h1>
      <p className="mt-3 text-sm text-navy/60">
        الصفحة اللي بتدور عليها مش موجودة أو تم حذفها
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-full bg-gradient-to-l from-navy to-turquoise px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-105 hover:shadow-lg"
      >
        الرجوع للرئيسية
      </Link>
    </div>
  );
}
