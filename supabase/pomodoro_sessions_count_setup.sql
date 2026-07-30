-- ============================================
-- عدّاد جلسات البومودورو المكتملة (يوميًا) — إصلاح انحراف سابق كان بيسجّل
-- "جلسات اليوم" في localStorage بس (مش متزامن بين الأجهزة)
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل study_tools_setup.sql، لأنه بيعدّل دالة record_pomodoro_minutes
-- الموجودة بالفعل)
-- ============================================

alter table public.daily_activity
  add column if not exists sessions_count integer not null default 0;

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

  insert into public.daily_activity (user_id, activity_date, minutes_active, pomodoro_minutes, sessions_count)
  values (auth.uid(), current_date, minutes_count, minutes_count, 1)
  on conflict (user_id, activity_date)
  do update set
    minutes_active = public.daily_activity.minutes_active + minutes_count,
    pomodoro_minutes = public.daily_activity.pomodoro_minutes + minutes_count,
    sessions_count = public.daily_activity.sessions_count + 1,
    updated_at = now();
end;
$$;
