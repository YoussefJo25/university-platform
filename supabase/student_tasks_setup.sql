-- ============================================
-- بوصلة المهام: قائمة مهام ومواعيد تسليم شخصية للطالب
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل auth_setup.sql؛ ومنطقيًا بعد attendance_setup.sql بما إن
-- course_id هنا بيشاور على courses.id بنفس نوعها bigint)
--
-- course_id: on delete set null (مش cascade) — لو المادة اتحذفت من
-- المنصة، المهمة الشخصية للطالب تفضل موجودة (لسه محتاج يخلّصها) بس
-- من غير ربط بمادة محذوفة، بدل ما تتمسح المهمة نفسها معاها.
-- ============================================

create table if not exists public.student_tasks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  course_id bigint references public.courses(id) on delete set null,
  due_date date not null,
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists student_tasks_profile_idx on public.student_tasks (profile_id);

alter table public.student_tasks enable row level security;

-- شخصية بالكامل: الطالب مالك كامل لبياناته هنا (عكس attendance_records
-- اللي مفيهاش update/delete عمدًا) — مفيش قرار إداري هنا يستدعي تقييد.
create policy "Students manage their own student_tasks" on public.student_tasks
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
