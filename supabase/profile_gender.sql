-- ============================================
-- إضافة الجنس لبروفايل المستخدم وقت التسجيل
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل auth_setup.sql, add_profile_fields.sql, و
-- profile_university_year.sql، لأنه بيعدّل جدول profiles ودالة
-- handle_new_user بنفس نمط الحقول اللي اتضافت قبل كده)
-- ============================================

alter table profiles add column if not exists gender text check (gender in ('male', 'female'));

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, university_id, year_id, gender)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    (new.raw_user_meta_data ->> 'university_id')::bigint,
    (new.raw_user_meta_data ->> 'year_id')::bigint,
    new.raw_user_meta_data ->> 'gender'
  );
  return new;
end;
$$;
