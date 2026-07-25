import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { getSiteSettings } from "@/lib/siteSettings";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "جامعة المنيا الاهلية",
  description: "المنصة الإلكترونية لجامعة المنيا الاهلية",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();

  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");document.documentElement.setAttribute("data-theme",t==="light"?"light":"dark");}catch(e){}})();`,
          }}
        />
        <Header universityName={settings.university_name} logoUrl={settings.logo_url} />
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer footerText={settings.footer_text} />
        <WhatsAppButton whatsappNumber={settings.whatsapp_number} />
      </body>
    </html>
  );
}
