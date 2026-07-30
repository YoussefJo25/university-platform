-- ============================================
-- جدول المحاضرات: العام (يديره الأدمن) + الشخصي (لكل طالب)
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل roles_v2_setup.sql و universities_setup.sql — بيستخدم
-- is_staff() الموجودة من daily_activity_setup.sql، وجدولي universities/years)
--
-- تأكيد الأنواع: راجعت supabase/universities_setup.sql و supabase/schema.sql
-- فعليًا قبل الكتابة — universities.id و years.id فعلاً bigint (مطابقين
-- تمامًا لافتراض البرومبت)، فمفيش أي تصحيح مطلوب هنا (على عكس content_id
-- بتاع الفيديو قبل كده).
--
-- المجموعات: مفيش أي حقل "مجموعة" على profiles حاليًا (راجعت كل ملفات
-- إضافة أعمدة profiles الموجودة) — زي ما البرومبت نص كبديل، اختيار
-- المجموعة هيبقى مؤقت في الواجهة (state محلي) مش محفوظ في قاعدة البيانات
-- في هذه النسخة.
-- ============================================

create table if not exists public.general_schedule_slots (
  id uuid primary key default gen_random_uuid(),
  university_id bigint references public.universities(id) on delete cascade not null,
  year_id bigint references public.years(id) on delete cascade not null,
  day_of_week smallint not null check (day_of_week between 0 and 4),
  period_number smallint not null check (period_number between 1 and 4),
  group_number smallint not null check (group_number between 1 and 4),
  course_name text not null,
  location text,
  instructor_name text,
  created_at timestamptz not null default now(),
  unique (university_id, year_id, day_of_week, period_number, group_number)
);

create table if not exists public.personal_schedule_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  day_of_week smallint not null check (day_of_week between 0 and 4),
  period_number smallint not null check (period_number between 1 and 4),
  course_name text not null,
  location text,
  instructor_name text,
  color_tag text,
  created_at timestamptz not null default now()
);

create index if not exists general_schedule_slots_lookup_idx
  on public.general_schedule_slots (university_id, year_id, group_number);

create index if not exists personal_schedule_slots_user_id_idx
  on public.personal_schedule_slots (user_id);

alter table public.general_schedule_slots enable row level security;
alter table public.personal_schedule_slots enable row level security;

-- الجدول العام: قراءة عامة لأي مستخدم مسجل دخول، وكتابة (إضافة/تعديل/حذف)
-- لـ is_staff() بس (year_admin أو super_admin) — نفس فلسفة التحكم في باقي
-- المنصة (قيود التخصيص بجامعة/فرقة بتتم في واجهة الأدمن نفسها، زي
-- restrictToAcademic في CoursesTab، مش في RLS).
create policy "Signed-in users can read general_schedule_slots" on public.general_schedule_slots
  for select using (auth.uid() is not null);

create policy "Staff can insert general_schedule_slots" on public.general_schedule_slots
  for insert with check (is_staff());

create policy "Staff can update general_schedule_slots" on public.general_schedule_slots
  for update using (is_staff()) with check (is_staff());

create policy "Staff can delete general_schedule_slots" on public.general_schedule_slots
  for delete using (is_staff());

-- الجدول الشخصي: كل مستخدم يدير صفوفه بس.
create policy "Users manage their own personal_schedule_slots" on public.personal_schedule_slots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
