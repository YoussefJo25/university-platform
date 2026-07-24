-- ============================================
-- القيادة ونبذة عن الجامعة
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل auth_setup.sql و site_settings_setup.sql، لأنه بيعتمد على
-- دالة is_admin() وجدول site_settings)
-- ============================================

-- 1) جدول أعضاء القيادة الثلاثة
create table if not exists leadership_members (
  id bigint generated always as identity primary key,
  role_key text not null unique check (role_key in ('developer', 'university_president', 'college_dean')),
  name text not null,
  title text,              -- مسمى إضافي زي "مطوّر المنصة وطالب بالجامعة"
  bio text,
  photo_url text,
  order_index integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table leadership_members enable row level security;

create policy "Public can read leadership_members" on leadership_members
  for select using (true);

create policy "Admins can manage leadership_members" on leadership_members
  for all using (is_admin()) with check (is_admin());

-- تعبئة الصفوف الثلاثة بقيم مبدئية فاضية عشان الأدمن يعدّلها من الداشبورد
insert into leadership_members (role_key, name, title, bio, order_index) values
  ('developer', 'اسمك هنا', 'مطوّر المنصة وطالب بالجامعة', 'نبذة قصيرة عنك...', 0),
  ('university_president', 'اسم رئيس الجامعة', 'رئيس الجامعة', 'نبذة قصيرة...', 1),
  ('college_dean', 'اسم عميد الكلية', 'عميد الكلية', 'نبذة قصيرة...', 2)
on conflict (role_key) do nothing;

-- 2) مفتاحين جدد في جدول site_settings الموجود بالفعل
insert into site_settings (key, value) values
  ('about_university_text', 'جامعة المنيا الاهلية من الجامعات الأهلية الحديثة، بتقدم تعليم عالي الجودة في تخصصات متنوعة.'),
  ('founding_year', '')
on conflict (key) do nothing;
