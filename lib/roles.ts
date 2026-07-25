export type Role = "student" | "year_admin" | "super_admin";

export const ROLE_LABELS: Record<Role, string> = {
  student: "طالب",
  year_admin: "أدمن فرقة",
  super_admin: "أدمن أعلى",
};

export function roleLabel(role: string | null | undefined): string {
  // "admin" هو اسم الدور القديم قبل تشغيل roles_v2_setup.sql (بيترحّل لـ
  // super_admin تلقائيًا)؛ بنسيبه هنا بس كتوافق مؤقت لحد ما الـ migration يتشغّل.
  if (role === "admin") return ROLE_LABELS.super_admin;
  return ROLE_LABELS[role as Role] ?? "طالب";
}

export function isStaffRole(role: string | null | undefined): boolean {
  // "admin" هو اسم الدور القديم قبل تشغيل roles_v2_setup.sql — بنعامله
  // كـ super_admin هنا كمان عشان محدش يتقفل بره لوحة التحكم فجأة في الفترة
  // بين نشر الكود ده وتشغيل الـ migration يدويًا.
  return role === "super_admin" || role === "year_admin" || role === "admin";
}
