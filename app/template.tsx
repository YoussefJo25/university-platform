"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

// template.tsx (بعكس layout.tsx) بيتعمله remount مع كل تنقل — بالظبط
// اللي محتاجينه عشان نفعّل انتقال بصري. مفيش route groups (زي (public))
// في المشروع أصلاً، فالملف ده حطيناه في جذر app/ مباشرة وبيغطي كل
// المسارات، مع استثناء صريح لـ /admin بالفحص اليدوي تحت.
//
// ملحوظة: Next.js بيعمل remount لـ template الجذر بس لما أول جزء من
// المسار يتغيّر (مش أي تنقل داخلي زي /universities → /universities/5).
// عشان نضمن إن الانتقال يشتغل مع أي تغيير مسار فعلي (مش بس أول segment)،
// حطينا key={pathname} على الـ motion.div نفسه — ده بيخلي React (مش
// Next) هو اللي بيقرر يعمل remount للعنصر ده تلقائيًا كل ما الـ pathname
// الكامل يتغيّر، بغض النظر عن سلوك template.tsx الداخلي بتاع Next.
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin || shouldReduceMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      key={pathname}
      // flex flex-1 flex-col: لازم يتطابقوا مع خصائص <main> في
      // app/layout.tsx (برضو flex flex-1 flex-col) — من غيرهم الصفحة
      // بتفقد الـ full-height/sticky-footer layout بتاعها لأن الـ div ده
      // بقى هو الابن المباشر لـ <main> بدل div الصفحة نفسها.
      className="flex flex-1 flex-col"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
