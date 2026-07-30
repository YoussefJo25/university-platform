"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDisplayName } from "@/lib/displayName";
import { isStaffRole } from "@/lib/roles";
import ThemeToggle from "@/components/ThemeToggle";

const baseNavLinks = [
  { href: "/", label: "الرئيسية" },
  { href: "/universities", label: "مسار الجامعات" },
  { href: "/learning-path", label: "مسار تعلم البرمجة" },
  { href: "/compiler", label: "الكمبايلر" },
];

type HeaderProps = {
  universityName: string;
  logoUrl: string | null;
};

export default function Header({ universityName, logoUrl }: HeaderProps) {
  const supabase = createClient();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasNoUniversity, setHasNoUniversity] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setEmail(user?.email ?? null);

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name, university_id")
          .eq("id", user.id)
          .single();
        setIsAdmin(isStaffRole(profile?.role));
        setDisplayName(getDisplayName(profile?.full_name, user.email));
        setHasNoUniversity(profile?.role === "student" && profile?.university_id == null);
      } else {
        setIsAdmin(false);
        setDisplayName(null);
        setHasNoUniversity(false);
      }
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    // تحديث البيانات لما المستخدم يعدّل بروفايله من /profile
    // (مش جزء من حالة الـ auth نفسها فمش بتطلق onAuthStateChange)
    window.addEventListener("profile-updated", loadUser);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("profile-updated", loadUser);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    // نفس مبدأ تسجيل الدخول: تنقل كامل بدل push/refresh عشان نضمن إن
    // السيرفر شايف إن الكوكيز اتمسحت فعلًا (مش هيفضل يعامل المستخدم
    // كمسجّل دخول لحظة أو اتنين بعد الضغط على "تسجيل الخروج").
    window.location.href = "/";
  }

  const navLinks = isAdmin
    ? [...baseNavLinks, { href: "/admin", label: "لوحة التحكم" }]
    : baseNavLinks;

  function renderNavLink(
    link: { href: string; label: string },
    className: string,
    onClick?: () => void
  ) {
    if (link.href === "/universities" && hasNoUniversity) {
      return (
        <span
          key={link.href}
          title="هذا القسم خاص بجامعات محددة"
          aria-disabled="true"
          className={`${className} cursor-not-allowed opacity-50`}
        >
          {link.label}
        </span>
      );
    }

    return (
      <Link key={link.href} href={link.href} onClick={onClick} className={className}>
        {link.label}
      </Link>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b border-subtle bg-panel shadow-md">
      <div className="flex items-center justify-between px-6 py-3 sm:px-10">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src={logoUrl || "/logo.jpeg"}
            alt={`شعار ${universityName}`}
            width={72}
            height={72}
            priority
            className="h-14 w-14 shrink-0 rounded-lg border border-gold/40 object-contain shadow-sm sm:h-16 sm:w-16"
          />
          <span className="font-display text-base font-bold text-ink sm:text-xl">
            {universityName}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) =>
            renderNavLink(link, "text-sm font-medium text-muted transition-colors hover:text-ink")
          )}

          <ThemeToggle />
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {email ? (
            <div className="flex items-center gap-4">
              <Link
                href="/profile"
                className="flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-ink"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/50 text-gold">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0ZM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                    />
                  </svg>
                </span>
                {displayName}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-subtle px-4 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-gold"
              >
                تسجيل خروج
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-gold-ink shadow-sm transition-transform hover:scale-105"
            >
              تسجيل الدخول
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-ink"
            aria-label="فتح القائمة"
            aria-expanded={isMenuOpen}
          >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-6 w-6"
          >
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            )}
          </svg>
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <nav className="flex flex-col gap-1 border-t border-subtle bg-panel px-4 py-3 md:hidden">
          {navLinks.map((link) =>
            renderNavLink(
              link,
              "rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-card hover:text-ink",
              () => setIsMenuOpen(false)
            )
          )}

          {email ? (
            <>
              <Link
                href="/profile"
                onClick={() => setIsMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-card hover:text-ink"
              >
                {displayName}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg px-3 py-2 text-right text-sm font-medium text-muted transition-colors hover:bg-card hover:text-ink"
              >
                تسجيل خروج
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setIsMenuOpen(false)}
              className="mt-1 inline-flex w-fit items-center justify-center rounded-full bg-gold px-5 py-2 text-sm font-semibold text-gold-ink shadow-sm"
            >
              تسجيل الدخول
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
