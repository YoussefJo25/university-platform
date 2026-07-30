import Link from "next/link";
import type { SiteSettings } from "@/lib/siteSettings";
import { MailIcon, PhoneIcon, WhatsAppIcon, FacebookIcon, LinkedInIcon, InstagramIcon } from "@/components/SocialIcons";

const quickLinks = [
  { href: "/", label: "الرئيسية" },
  { href: "/universities", label: "مسار الجامعات" },
  { href: "/learning-path", label: "مسار تعلم البرمجة" },
  { href: "/compiler", label: "الكمبايلر" },
  { href: "/support", label: "الدعم الفني" },
];

const socialLinks = [
  { key: "social_facebook" as const, label: "فيسبوك", Icon: FacebookIcon },
  { key: "social_linkedin" as const, label: "لينكد إن", Icon: LinkedInIcon },
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
            <ul className="mt-3 flex flex-col gap-2.5">
              {activeSocialLinks.map(({ key, label, Icon }) => (
                <li key={key}>
                  <a
                    href={settings[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-gold"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{label}</span>
                  </a>
                </li>
              ))}
            </ul>
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
