-- ============================================
-- تتبّع وقت الطالب الفعلي على المنصة (Heartbeat System)
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل roles_v2_setup.sql، لأنه بيعتمد على جدول profiles ونمط
-- is_super_admin() الموجود بالفعل)
--
-- المبدأ: المتصفح بيبعت "نبضة" كل دقيقة (RPC واحدة بس، record_heartbeat)
-- لو الطالب فعلاً نشط أو فيه فيديو شغال. مفيش أي insert/update policy
-- للمستخدم العادي على الجدول ده عمدًا — الكتابة الوحيدة المسموحة هي عن
-- طريق الدالة دي (security definer وبتاخد auth.uid() من السيرفر نفسه)،
-- عشان محدش يقدر يتلاعب بوقت حساب تاني حتى لو حاول يبعت طلب مباشر
-- للجدول من الـ client.
-- ============================================

create table if not exists public.daily_activity (
  user_id uuid references auth.users(id) on delete cascade not null,
  activity_date date not null default current_date,
  minutes_active integer not null default 0,
  video_minutes integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, activity_date)
);

create index if not exists daily_activity_activity_date_idx on public.daily_activity (activity_date);

alter table public.daily_activity enable row level security;

-- دالة مساعدة بنفس نمط is_super_admin() — بتتحقق إن المستخدم الحالي
-- أدمن فرقة أو أدمن أعلى (أي دور إداري)، عشان صفحة "وقت الطلاب" تبان
-- للاتنين زي ما هو مطلوب.
create or replace function is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role in ('year_admin', 'super_admin')
  );
$$;

create policy "Users can read their own daily_activity" on public.daily_activity
  for select using (auth.uid() = user_id);

create policy "Staff can read all daily_activity" on public.daily_activity
  for select using (is_staff());

-- تسجيل نبضة نشاط لليوم الحالي بتاع المستخدم المسجّل دخوله بس (auth.uid()
-- بييجي من الجلسة على السيرفر، مش من أي parameter من الـ client) — upsert:
-- أول نبضة في اليوم بتعمل صف جديد، وأي نبضة بعد كده بتزوّد على نفس الصف.
create or replace function record_heartbeat(is_video boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول لتسجيل النشاط';
  end if;

  insert into public.daily_activity (user_id, activity_date, minutes_active, video_minutes)
  values (auth.uid(), current_date, 1, case when is_video then 1 else 0 end)
  on conflict (user_id, activity_date) do update
    set minutes_active = public.daily_activity.minutes_active + 1,
        video_minutes = public.daily_activity.video_minutes
          + (case when is_video then 1 else 0 end),
        updated_at = now();
end;
$$;
