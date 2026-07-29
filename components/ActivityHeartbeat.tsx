"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useActivityHeartbeat } from "@/hooks/useActivityHeartbeat";

// مكوّن بدون أي عرض مرئي (بيرجّع null) — شغله الوحيد إنه يتأكد إن فيه
// مستخدم مسجّل دخول قبل ما يشغّل الـ heartbeat hook، عشان الزوار مش
// مسجلين دخول محدش يتسجّل نشاطهم (RPC أصلاً بيرفض auth.uid() null، بس
// مفيش داعي نضرب طلبات فاضية كل دقيقة من غير سيشن).
export default function ActivityHeartbeat() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function checkSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkSession();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useActivityHeartbeat(isLoggedIn);

  return null;
}
