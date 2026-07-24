-- ============================================
-- سياسة تعديل البروفايل الشخصي
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل auth_setup.sql)
-- ============================================

create policy "Users can update their own profile" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
