import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSiteSettings } from "@/lib/siteSettings";

// أيقونة التاب متولّدة من نفس دومين الموقع بدل ما تتحط كرابط خارجي في
// الـ metadata: بعض المتصفحات بتحاول تجيب /favicon.ico مباشرة وبتتجاهل
// روابط خارجية (Supabase Storage) للأيقونة، فالحل الموثوق هو نرجّع
// الصورة إحنا بنفسنا من Route زي ده.
export default async function Icon() {
  const settings = await getSiteSettings();

  if (settings.logo_url) {
    try {
      const response = await fetch(settings.logo_url, { next: { revalidate: 300 } });
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get("content-type") ?? "image/png";
        return new Response(buffer, { headers: { "Content-Type": contentType } });
      }
    } catch {
      // نكمل للوجو الافتراضي تحت
    }
  }

  const fallback = await readFile(path.join(process.cwd(), "public", "logo.jpeg"));
  return new Response(new Uint8Array(fallback), { headers: { "Content-Type": "image/jpeg" } });
}
