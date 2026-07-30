-- ============================================
-- نظام الإنجازات (Achievements / Badges)
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل pomodoro_sessions_count_setup.sql، لأنه بيعتمد على أعمدة
-- pomodoro_minutes و sessions_count المضافة هناك على جدول daily_activity،
-- وبيستبدل (create or replace) الدالتين record_heartbeat و
-- record_pomodoro_minutes الموجودتين بالفعل بإضافة نداء واحد بس في آخر كل
-- واحدة منهم — باقي منطق الدالتين الأصلي زي ما هو بالحرف)
--
-- ملاحظة نوع user_id: هنا uuid فعلاً وصح (بيشير مباشرة لـ auth.users(id)
-- اللي نوعه uuid في Supabase Auth نفسه) — مفيش تعارض زي حالة
-- universities.id (bigint) أو معرّف الفيديو (نص مركّب) اللي قابلناهم قبل كده.
-- ============================================

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  achievement_key text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_key)
);

create index if not exists user_achievements_user_id_idx on public.user_achievements (user_id);

alter table public.user_achievements enable row level security;

create policy "Users can read their own user_achievements" on public.user_achievements
  for select using (auth.uid() = user_id);

-- مفيش insert/update/delete policy للمستخدم العادي عمدًا — نفس فلسفة
-- daily_activity: الكتابة الوحيدة المسموحة عن طريق الدالة اللي تحت
-- (security definer)، عشان محدش يقدر يفتح بادچ لنفسه مباشرة من الـ client.

-- الدالة اللي بتفحص كل شروط البادجات وتفتح اللي استحقّه المستخدم (بتتنادى
-- داخليًا بس من record_heartbeat و record_pomodoro_minutes تحت، مش RPC
-- مكشوفة للـ client).
create or replace function public.check_and_unlock_achievements(
  p_user_id uuid,
  p_is_night boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_pomodoro_minutes integer;
  v_total_sessions integer;
  v_streak_days integer;
begin
  select coalesce(sum(pomodoro_minutes), 0), coalesce(sum(sessions_count), 0)
    into v_total_pomodoro_minutes, v_total_sessions
    from public.daily_activity
    where user_id = p_user_id;

  -- 📚 أول خطوة: أول جلسة بومودورو مكتملة على الإطلاق
  if v_total_sessions >= 1 then
    insert into public.user_achievements (user_id, achievement_key)
    values (p_user_id, 'first_step')
    on conflict (user_id, achievement_key) do nothing;
  end if;

  -- 🎯 10 جلسات: إجمالي sessions_count وصل 10
  if v_total_sessions >= 10 then
    insert into public.user_achievements (user_id, achievement_key)
    values (p_user_id, 'ten_sessions')
    on conflict (user_id, achievement_key) do nothing;
  end if;

  -- ⏱️ 100 دقيقة تركيز: مجموع pomodoro_minutes وصل 100
  if v_total_pomodoro_minutes >= 100 then
    insert into public.user_achievements (user_id, achievement_key)
    values (p_user_id, 'hundred_minutes')
    on conflict (user_id, achievement_key) do nothing;
  end if;

  -- 🌙 مذاكرة ليلية: نشاط بعد منتصف الليل. مفيش وقت مخزّن فعليًا في
  -- daily_activity (تجميع يومي بس)، فبنحسب الشرط لحظة النشاط نفسه (وقت
  -- نداء الدالة) بتوقيت القاهرة، ونمرره كـ parameter من الدالتين تحت.
  if p_is_night then
    insert into public.user_achievements (user_id, achievement_key)
    values (p_user_id, 'night_owl')
    on conflict (user_id, achievement_key) do nothing;
  end if;

  -- 🔥 أسبوع متواصل: نشاط مسجّل في كل واحد من آخر 7 أيام (شامل النهاردة)
  select count(*) into v_streak_days
    from public.daily_activity
    where user_id = p_user_id
      and activity_date > current_date - 7
      and activity_date <= current_date;

  if v_streak_days >= 7 then
    insert into public.user_achievements (user_id, achievement_key)
    values (p_user_id, 'week_streak')
    on conflict (user_id, achievement_key) do nothing;
  end if;
end;
$$;

-- تحديث record_heartbeat (من daily_activity_setup.sql): نفس المنطق الأصلي
-- بالحرف + نداء فحص الإنجازات في الآخر. "بعد منتصف الليل" بنعتبرها من
-- الساعة 12 لحد 5 الفجر بتوقيت القاهرة.
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

  perform public.check_and_unlock_achievements(
    auth.uid(),
    extract(hour from (now() at time zone 'Africa/Cairo')) < 5
  );
end;
$$;

-- تحديث record_pomodoro_minutes (من pomodoro_sessions_count_setup.sql): نفس
-- المنطق الأصلي بالحرف + نفس نداء فحص الإنجازات.
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

  perform public.check_and_unlock_achievements(
    auth.uid(),
    extract(hour from (now() at time zone 'Africa/Cairo')) < 5
  );
end;
$$;

grant execute on function public.record_pomodoro_minutes(integer) to authenticated;
