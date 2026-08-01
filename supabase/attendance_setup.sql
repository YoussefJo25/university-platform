-- ============================================
-- بوصلة الحضور: تسجيل حضور ذاتي للطالب لكل مادة (محاضرة/سكشن)
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل roles_v2_setup.sql و daily_activity_setup.sql، لاستخدام is_staff())
--
-- تأكيد النوع: راجعت supabase/schema.sql و universities_setup.sql فعليًا —
-- courses.id فعلاً bigint، فـ attendance_records.course_id هنا bigint
-- مطابق تمامًا (مفيش تعارض نوع زي حالات سابقة).
-- ============================================

alter table public.courses
  add column if not exists has_section boolean not null default false;

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  course_id bigint not null references public.courses(id) on delete cascade,
  session_type text not null default 'lecture' check (session_type in ('lecture', 'section')),
  attended_at date not null default current_date,
  created_at timestamptz not null default now(),
  unique (profile_id, course_id, session_type, attended_at)
);

create index if not exists attendance_records_profile_idx on public.attendance_records (profile_id);

alter table public.attendance_records enable row level security;

create policy "Students can read their own attendance_records" on public.attendance_records
  for select using (auth.uid() = profile_id);

create policy "Students can insert their own attendance_records" on public.attendance_records
  for insert with check (auth.uid() = profile_id);

-- مفيش update/delete policy خالص لأي حد (حتى الطالب نفسه) — قيد مقصود
-- بالكامل زي ما طلب البرومبت، عشان محدش يقدر "يزوّر" سجل حضور قديم بعد
-- ما يتسجل. القيد unique فوق بيمنع تكرار نفس اليوم أصلاً.

create policy "Staff can read all attendance_records" on public.attendance_records
  for select using (is_staff());
