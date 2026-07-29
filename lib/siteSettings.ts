export type SiteSettings = {
  university_name: string;
  logo_url: string | null;
  hero_title: string;
  hero_subtitle: string;
  support_email: string;
  support_phone: string;
  social_facebook: string;
  social_linkedin: string;
  social_instagram: string;
  footer_text: string;
  whatsapp_number: string;
  // محتوى الصفحة الرئيسية الجديد (ثيم "بوصلة" المنقّح، المرحلة 6) — نص
  // الإهداء المنفصل (DedicationSection) مش موجود هنا عمدًا لأنه بياخد
  // بياناته من جدول leadership_members (role_key = "dedication")
  // الموجود بالفعل، مش من site_settings، عشان مايبقاش فيه مصدرين
  // منفصلين لنفس المعنى.
  hero_title_line1: string;
  hero_title_highlight: string;
  hero_title_line2: string;
  hero_dedication_text: string;
  journey_station_1_title: string;
  journey_station_1_sub: string;
  journey_station_2_title: string;
  journey_station_2_sub: string;
  journey_station_3_title: string;
  journey_station_3_sub: string;
  journey_station_4_title: string;
  journey_station_4_sub: string;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  university_name: "جامعة المنيا الاهلية",
  logo_url: null,
  hero_title: "مرحبًا بكم في جامعة المنيا الاهلية",
  hero_subtitle: "منصتكم الإلكترونية الموحدة للمحاضرات والجداول والخدمات الأكاديمية",
  support_email: "support@minia-national.edu.eg",
  support_phone: "",
  social_facebook: "",
  social_linkedin: "",
  social_instagram: "",
  footer_text: "جميع الحقوق محفوظة لجامعة المنيا الاهلية",
  whatsapp_number: "",
  hero_title_line1: "ابحث عن",
  hero_title_highlight: "طريقك",
  hero_title_line2: "وسط زحمة المذاكرة",
  hero_dedication_text: "كل مادة، كل فيديو، كل صفحة هنا اتحطت بحب، إهداءً لروح غالية علينا",
  journey_station_1_title: "الفرقة الأولى",
  journey_station_1_sub: "أول خطوة في رحلتك",
  journey_station_2_title: "الفرقة الثانية",
  journey_station_2_sub: "تعمّق أكتر في التخصص",
  journey_station_3_title: "الفرقة الثالثة",
  journey_station_3_sub: "مهارات عملية وتطبيقية",
  journey_station_4_title: "الفرقة الرابعة",
  journey_station_4_sub: "استعداد لسوق العمل",
};

type SettingRow = { key: string; value: string | null };

export function mergeSiteSettingsRows(rows: SettingRow[]): SiteSettings {
  const settings: SiteSettings = { ...DEFAULT_SITE_SETTINGS };
  const record = settings as unknown as Record<string, string | null>;

  for (const row of rows) {
    if (row.key in DEFAULT_SITE_SETTINGS && row.value !== null) {
      record[row.key] = row.value;
    }
  }

  return settings;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const url = new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/site_settings`);
    url.searchParams.set("select", "key,value");

    const response = await fetch(url.toString(), {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return DEFAULT_SITE_SETTINGS;
    }

    const rows = (await response.json()) as SettingRow[];
    return mergeSiteSettingsRows(rows);
  } catch (error) {
    console.warn("Failed to fetch site settings:", error);
    return DEFAULT_SITE_SETTINGS;
  }
}
