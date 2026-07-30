-- ============================================
-- أدوات المذاكرة: بومودورو + تاسكات
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل daily_activity_setup.sql، لأنه بيضيف عمود على جدول
-- daily_activity الموجود بالفعل)
-- ============================================

-- 1) قوائم التاسكات + التاسكات نفسها
create table if not exists public.task_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  is_default boolean not null default false,
  sort_by text not null default 'my_order', -- my_order | date | deadline | starred_recently | title
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references public.task_lists(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  is_completed boolean not null default false,
  is_starred boolean not null default false,
  -- starred_at: مش موجود في التصميم الأصلي، ضفناه عشان خيار الترتيب
  -- "الأحدث تمييزًا بنجمة" محتاج تاريخ فعلي للترتيب عليه (مش بس true/false).
  -- بيتحدّث من الـ client مع كل toggle للنجمة (now() لو starred، null لو
  -- اتشالت النجمة).
  starred_at timestamptz,
  due_date date,
  order_index integer not null default 0, -- للترتيب اليدوي (My order)
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists tasks_list_id_idx on public.tasks (list_id);
create index if not exists tasks_user_id_idx on public.tasks (user_id);

alter table public.task_lists enable row level security;
alter table public.tasks enable row level security;

create policy "Users manage their own task_lists" on public.task_lists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own tasks" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2) إعدادات البومودورو الشخصية — جدول (مش localStorage) عشان تفضل
-- متزامنة لو الطالب فتح المنصة من أكتر من جهاز، ونفس فلسفة site_settings
-- المستخدمة في باقي المشروع (كل حاجة قابلة للتعديل متخزّنة في Supabase).
create table if not exists public.user_pomodoro_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  focus_minutes integer not null default 25,
  short_break_minutes integer not null default 5,
  long_break_minutes integer not null default 15,
  auto_start_breaks boolean not null default false,
  auto_start_focus boolean not null default false,
  long_break_interval integer not null default 4,
  alarm_volume integer not null default 100,
  updated_at timestamptz not null default now()
);

alter table public.user_pomodoro_settings enable row level security;

create policy "Users manage their own pomodoro settings" on public.user_pomodoro_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3) عمود دقائق البومودورو على daily_activity الموجود، وربطه بـ minutes_active
alter table public.daily_activity
  add column if not exists pomodoro_minutes integer not null default 0;

create or replace function public.record_pomodoro_minutes(minutes_count integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول لتسجيل دقائق البومودورو';
  end if;

  insert into public.daily_activity (user_id, activity_date, minutes_active, pomodoro_minutes)
  values (auth.uid(), current_date, minutes_count, minutes_count)
  on conflict (user_id, activity_date)
  do update set
    minutes_active = public.daily_activity.minutes_active + minutes_count,
    pomodoro_minutes = public.daily_activity.pomodoro_minutes + minutes_count,
    updated_at = now();
end;
$$;

grant execute on function public.record_pomodoro_minutes(integer) to authenticated;
