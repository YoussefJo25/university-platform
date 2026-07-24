-- ============================================
-- إعداد Supabase Storage لملفات الكتب (PDF)
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل auth_setup.sql، لأنه بيعتمد على دالة is_admin())
-- ============================================

-- 1) إنشاء bucket عام لتخزين ملفات الكتب
insert into storage.buckets (id, name, public)
values ('books', 'books', true)
on conflict (id) do nothing;

-- 2) قراءة عامة لملفات الكتب (الزوار والطلاب يقدروا يفتحوا/يحمّلوا الملفات)
create policy "Public can read book files" on storage.objects
  for select using (bucket_id = 'books');

-- 3) رفع/تعديل/حذف الملفات للأدمن بس
create policy "Admins can upload book files" on storage.objects
  for insert with check (bucket_id = 'books' and is_admin());

create policy "Admins can update book files" on storage.objects
  for update using (bucket_id = 'books' and is_admin());

create policy "Admins can delete book files" on storage.objects
  for delete using (bucket_id = 'books' and is_admin());
