import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isStaffRole } from "@/lib/roles";

// الصفحات دي بس المسموح تتصفحها من غير تسجيل دخول. أي مسار تاني (حتى لو
// اتضاف مستقبلًا) بيتقفل تلقائيًا بدل ما يفضل عام بالغلط لحد ما حد يفتكر
// يضيفه هنا يدويًا.
const PUBLIC_PATHS = ["/", "/login", "/forgot-password", "/reset-password", "/support"];

export default async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  let profile: { role: string | null; is_active: boolean } | null = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();
    profile = data;

    // حساب متعطّل: تسجيل خروج فوري بغض النظر عن الصفحة اللي بيحاول
    // يوصلها، حتى لو صفحة عامة — عشان محدش يفضل قاعد بسيشن نشطة بعد
    // ما الأدمن يعطّل حسابه.
    if (profile && profile.is_active === false) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?disabled=1", request.url));
    }
  }

  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (!isStaffRole(profile?.role)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  } else if (!PUBLIC_PATHS.includes(pathname) && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.jpeg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
