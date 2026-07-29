-- ============================================
-- دعم "جامعة أخرى" وقت التسجيل
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل profile_gender.sql/fix_gender_trigger.sql، لأنه بيعدّل
-- دالة handle_new_user() بنفس نمط الحقول اللي اتضافت قبل كده)
--
-- تنبيه مهم (نفس مشكلة عمود gender اللي اتصلحت في fix_gender_trigger.sql):
-- لازم تشغّل الملف ده كامل فعليًا على قاعدة البيانات الحقيقية، مش بس
-- تسيبه في الكود — أي نسخة قديمة من handle_new_user() شغالة على الداتابيز
-- هتفضل بتتجاهل other_university_name بصمت لحد ما تشغّل الـ create or
-- replace function اللي تحت ده بنفسك.
--
-- الاختيار المعماري: university_id = NULL هو اللي بيميّز حالة "أخرى"
-- (مش صف وهمي في جدول universities) لأن العمود أصلًا nullable
-- (references universities(id) on delete set null) ومفيش أي RLS policy
-- حالياً بتفلتر على university_id (راجع universities_setup.sql/
-- roles_v2_policies_update.sql) — يعني مفيش سياسات محتاجة تعديل هنا.
-- ============================================

alter table profiles add column if not exists other_university_name text;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, email, full_name, phone, university_id, year_id, gender, other_university_name
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    (new.raw_user_meta_data ->> 'university_id')::bigint,
    (new.raw_user_meta_data ->> 'year_id')::bigint,
    new.raw_user_meta_data ->> 'gender',
    new.raw_user_meta_data ->> 'other_university_name'
  );
  return new;
end;
$$;
