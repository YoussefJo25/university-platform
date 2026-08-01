-- ============================================
-- تطوير بوصلة الحضور: حضور/غياب + نسبة مئوية ديناميكية + إعادة تعيين
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل attendance_setup.sql)
-- ============================================

alter table public.attendance_records
  add column if not exists status text not null default 'present' check (status in ('present', 'absent'));

-- ============================================
-- ملاحظة تصميم مقصودة: attendance_setup.sql الأصلي كان عامدًا يمنع أي
-- UPDATE/DELETE خالص (حتى للطالب نفسه) عشان محدش يقدر "يزوّر" سجل قديم.
-- المبدأ ده لسه قائم على مستوى الصف المفرد — بس البرومبت ده طلب صراحةً
-- إمكانية "إعادة تعيين" تمسح سجل مادة/نوع حصة **بالكامل** (كل الصفوف
-- المطابقة لـ course_id+session_type مرة واحدة)، مش تعديل/حذف صف بعينه.
-- الـ policy هنا بتسمح بالحذف على مستوى القاعدة (RLS مش بتقدر تفرّق بين
-- "حذف كل صفوف مادة معينة" و"حذف صف واحد" — الفرق ده مسؤولية الواجهة:
-- الكود في AttendanceTracker.tsx بيستهدف دايمًا كل صفوف نفس
-- course_id+session_type سوا، مفيش أي مسار في الواجهة بيحذف صف مفرد لوحده.
-- ============================================
create policy "Students can delete their own attendance_records" on public.attendance_records
  for delete using (auth.uid() = profile_id);
