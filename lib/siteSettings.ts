export type SiteSettings = {
  university_name: string;
  logo_url: string | null;
  hero_title: string;
  hero_subtitle: string;
  support_email: string;
  support_phone: string;
  social_facebook: string;
  social_twitter: string;
  social_instagram: string;
  footer_text: string;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  university_name: "جامعة المنيا الاهلية",
  logo_url: null,
  hero_title: "مرحبًا بكم في جامعة المنيا الاهلية",
  hero_subtitle: "منصتكم الإلكترونية الموحدة للمحاضرات والجداول والخدمات الأكاديمية",
  support_email: "support@minia-national.edu.eg",
  support_phone: "",
  social_facebook: "",
  social_twitter: "",
  social_instagram: "",
  footer_text: "جميع الحقوق محفوظة لجامعة المنيا الاهلية",
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
