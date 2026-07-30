-- ============================================
-- حاسبة تقدير المعدل (GPA Calculator)
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل auth_setup.sql بس — مفيش أي اعتماد على جداول أدوات
-- المذاكرة التانية)
-- ============================================

create table if not exists public.gpa_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  course_name text not null,
  credit_hours numeric not null,
  grade text not null,
  created_at timestamptz not null default now()
);

create index if not exists gpa_entries_user_id_idx on public.gpa_entries (user_id);

alter table public.gpa_entries enable row level security;

create policy "Users manage their own gpa_entries" on public.gpa_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
