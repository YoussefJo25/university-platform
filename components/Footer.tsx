import Link from "next/link";
import type { SiteSettings } from "@/lib/siteSettings";

const quickLinks = [
  { href: "/", label: "الرئيسية" },
  { href: "/universities", label: "السنين الدراسية" },
  { href: "/learning-path", label: "مسار تعلم البرمجة" },
  { href: "/compiler", label: "الكمبايلر" },
  { href: "/support", label: "الدعم الفني" },
];

const socialLinks = [
  { key: "social_facebook" as const, label: "فيسبوك", Icon: FacebookIcon },
  { key: "social_twitter" as const, label: "تويتر", Icon: TwitterIcon },
  { key: "social_instagram" as const, label: "انستجرام", Icon: InstagramIcon },
];

export default function Footer({ settings }: { settings: SiteSettings }) {
  const activeSocialLinks = socialLinks.filter((link) => settings[link.key]);

  return (
    <footer className="border-t border-subtle bg-panel text-muted">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <h2 className="text-lg font-extrabold font-display text-ink">{settings.university_name}</h2>
          <p className="mt-3 text-sm leading-6 text-muted">{settings.hero_subtitle}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink">روابط سريعة</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-muted transition-colors hover:text-gold"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink">تواصل معنا</h3>
          <ul className="mt-3 flex flex-col gap-2.5">
            {settings.support_email && (
              <li>
                <a
                  href={`mailto:${settings.support_email}`}
                  className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-gold"
                >
                  <MailIcon className="h-4 w-4 shrink-0" />
                  <span>{settings.support_email}</span>
                </a>
              </li>
            )}
            {settings.support_phone && (
              <li>
                <a
                  href={`tel:${settings.support_phone}`}
                  className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-gold"
                >
                  <PhoneIcon className="h-4 w-4 shrink-0" />
                  <span>{settings.support_phone}</span>
                </a>
              </li>
            )}
            {settings.whatsapp_number && (
              <li>
                <a
                  href={`https://wa.me/${settings.whatsapp_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-gold"
                >
                  <WhatsAppIcon className="h-4 w-4 shrink-0" />
                  <span>واتساب</span>
                </a>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink">تابعنا</h3>
          {activeSocialLinks.length > 0 ? (
            <div className="mt-3 flex items-center gap-4">
              {activeSocialLinks.map(({ key, label, Icon }) => (
                <a
                  key={key}
                  href={settings[key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-muted transition-colors hover:text-gold"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">—</p>
          )}
        </div>
      </div>

      <div className="border-t border-subtle px-4 py-5 text-center text-sm sm:px-6">
        <p>
          {settings.footer_text} © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
      />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
      />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <line x1="4" y1="4" x2="20" y2="20" strokeLinecap="round" />
      <line x1="20" y1="4" x2="4" y2="20" strokeLinecap="round" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.25" />
      <circle cx="17.25" cy="6.75" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
