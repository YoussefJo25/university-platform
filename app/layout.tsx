import type { Metadata } from "next";
import { Cairo, Aref_Ruqaa, Playfair_Display } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import ActivityHeartbeat from "@/components/ActivityHeartbeat";
import CustomCursor from "@/components/CustomCursor";
import { VideoActivityProvider } from "@/contexts/VideoActivityContext";
import { getSiteSettings } from "@/lib/siteSettings";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
});

// خط العناوين الكبيرة (Hero/H1/H2 الرئيسية واسم المنصة) بس — النص العادي
// كله بيستخدم Cairo. عربي وإنجليزي متعرّفين منفصلين عشان كل سكريبت ياخد
// خطه المناسب (Aref Ruqaa للعربي، Playfair Display Italic للإنجليزي) لما
// العنوان يبقى فيه خليط، زي "بوصلة | Bawsala".
const displayFontAr = Aref_Ruqaa({
  weight: "700",
  subsets: ["arabic"],
  variable: "--font-display-ar",
});

const displayFontEn = Playfair_Display({
  style: "italic",
  subsets: ["latin"],
  variable: "--font-display-en",
});

// ديناميكي من site_settings بدل ثابت في الكود، عشان تغيير الاسم أو
// اللوجو من /admin ينعكس فورًا على بيانات المشاركة (Open Graph) والعنوان،
// من غير ما يحتاج تعديل كود جديد كل مرة. لو صفحة معينة عايزة عنوان خاص
// بيها لاحقًا، تقدر تصدّر metadata/generateMetadata خاصة بيها وهتفضل
// الأساسية دي Fallback للصفحات اللي مالهاش عنوان مخصص.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return {
    title: settings.university_name,
    description: settings.hero_subtitle,
    openGraph: {
      title: settings.university_name,
      description: settings.hero_subtitle,
      images: settings.logo_url ? [{ url: settings.logo_url }] : [],
    },
    // الأيقونة نفسها متولّدة من app/icon.tsx (نفس دومين الموقع) بدل ما
    // تتحط هنا كرابط خارجي — بعض المتصفحات بتتجاهل رابط favicon خارجي
    // في الـ <head> وبتفضل تجيبه من نفس الأصل بس.
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();

  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${displayFontAr.variable} ${displayFontEn.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");document.documentElement.setAttribute("data-theme",t==="light"?"light":"dark");}catch(e){}})();`,
          }}
        />
        <VideoActivityProvider>
          <ActivityHeartbeat />
          <CustomCursor />
          <Header universityName={settings.university_name} logoUrl={settings.logo_url} />
          <main className="flex flex-1 flex-col">{children}</main>
          <Footer settings={settings} />
          <WhatsAppButton whatsappNumber={settings.whatsapp_number} />
        </VideoActivityProvider>
      </body>
    </html>
  );
}
