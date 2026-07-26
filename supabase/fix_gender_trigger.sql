-- ============================================
-- إصلاح: عمود gender مش بيتحفظ عند التسجيل
--
-- السبب الفعلي: دالة handle_new_user() اتعدّلت 4 مرات عبر ملفات مختلفة
-- (auth_setup.sql ← add_profile_fields.sql ← profile_university_year.sql
-- ← profile_gender.sql)، وآخر نسخة صح (profile_gender.sql) موجودة في
-- الكود بس يبدو إنها ماتشغّلتش فعليًا على قاعدة البيانات الحقيقية — يعني
-- النسخة الشغالة دلوقتي هي نسخة profile_university_year.sql (بتحفظ
-- full_name/phone/university_id/year_id بس، وبتتجاهل gender بصمت لأنها
-- أصلًا مش عارفة إن العمود ده موجود). ده اللي بيفسّر إن باقي الحقول بتتحفظ
-- صح وgender بس هو اللي بيفضل NULL.
--
-- الملف ده مفيهوش أي حاجة جديدة منطقيًا — نفس نسخة profile_gender.sql
-- بالظبط — بس باسم واضح مستقل عشان تتشغّل دلوقتي على الداتابيز الحقيقية
-- من غير لبس، وتبقى النسخة النهائية اللي فيها كل الحقول مع بعض.
--
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase.
-- ============================================

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
