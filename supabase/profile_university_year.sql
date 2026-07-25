-- ============================================
-- إضافة الجامعة والفرقة الدراسية لبروفايل المستخدم وقت التسجيل
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل auth_setup.sql, add_profile_fields.sql, و universities_setup.sql،
-- لأنه بيعدّل جدول profiles ودالة handle_new_user، وبيربط بجدولي
-- universities و years)
-- ============================================

alter table profiles add column if not exists university_id bigint references universities (id) on delete set null;
alter table profiles add column if not exists year_id bigint references years (id) on delete set null;

-- تحديث دالة الـ trigger عشان تقرا university_id و year_id كمان من بيانات
-- التسجيل (raw_user_meta_data)، بنفس نمط full_name/phone الموجود بالفعل
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, university_id, year_id)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    (new.raw_user_meta_data ->> 'university_id')::bigint,
    (new.raw_user_meta_data ->> 'year_id')::bigint
  );
  return new;
end;
$$;
