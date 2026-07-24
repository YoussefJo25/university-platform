-- ============================================
-- إضافة الاسم الكامل ورقم الهاتف لبروفايل المستخدم
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل auth_setup.sql، لأنه بيعدّل جدول profiles ودالة handle_new_user)
-- ============================================

alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists phone text;

-- تحديث دالة الـ trigger عشان تقرا full_name و phone من بيانات التسجيل
-- (raw_user_meta_data) وتحطهم في profiles وقت إنشاء الحساب
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;
