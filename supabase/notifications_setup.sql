-- ============================================
-- الإشعارات داخل المنصة (In-app Notifications)
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل roles_v2_setup.sql، achievements_setup.sql، و qa_system_setup.sql
-- — لأنه بيعدّل (create or replace) الدالتين check_and_unlock_achievements
-- و post_video_answer الموجودتين بالفعل، بإضافة إشعار في الآخر بس، باقي
-- منطقهما الأصلي زي ما هو بالحرف)
-- ============================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null, -- 'qa_reply' | 'new_content' | 'achievement' | 'inactivity_reminder'
  title text not null,
  link_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "Users manage their own notifications" on public.notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================
-- بث جماعي: "محتوى جديد" لازم يوصل لكل مستخدم مسجل فعليًا على المنصة (مش
-- بس المتابعين لمادة/جامعة معينة — طلب صريح). INSERT...SELECT واحد بس من
-- auth.users (مش loop بينادي الدالة لكل مستخدم لوحده) عشان الأداء لو عدد
-- المستخدمين كبير.
--
-- محمية بـ is_staff() جوه الدالة نفسها: لو سيبناها من غير الشرط ده، أي
-- طالب كان يقدر ينفّذها من console المتصفح (RPC اسمها معروف) ويبعت
-- إشعار وهمي لكل مستخدم على المنصة دفعة واحدة.
-- ============================================
create or replace function public.broadcast_notification(
  p_type text,
  p_title text,
  p_link_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_staff() then
    raise exception 'غير مسموح لك بإرسال إشعار جماعي';
  end if;

  insert into public.notifications (user_id, type, title, link_url)
  select id, p_type, p_title, p_link_url from auth.users;
end;
$$;

grant execute on function public.broadcast_notification(text, text, text) to authenticated;

-- ============================================
-- تحديث post_video_answer (من qa_system_setup.sql): نفس المنطق الأصلي
-- بالحرف + إشعار للسائل الأصلي لو حد تاني رد عليه (مش هو نفسه). بنفك
-- video_id (نفس صيغة content_id المركّبة) عشان نجيب المادة ونبني الرابط.
-- ============================================
create or replace function public.post_video_answer(p_question_id uuid, p_answer_text text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_is_staff boolean;
  v_id uuid;
  v_asker_id uuid;
  v_video_id text;
  v_row_id_text text;
  v_row_id bigint;
  v_course_id bigint;
  v_link_url text;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول للرد';
  end if;

  select coalesce(nullif(trim(full_name), ''), split_part(email, '@', 1), 'مستخدم'),
         role in ('year_admin', 'super_admin')
    into v_display_name, v_is_staff
    from public.profiles
    where id = auth.uid();

  insert into public.video_answers (question_id, user_id, answerer_name, is_staff_answer, answer_text)
  values (p_question_id, auth.uid(), coalesce(v_display_name, 'مستخدم'), coalesce(v_is_staff, false), p_answer_text)
  returning id into v_id;

  select user_id, video_id into v_asker_id, v_video_id
    from public.video_questions
    where id = p_question_id;

  if v_asker_id is not null and v_asker_id <> auth.uid() then
    v_row_id_text := case
      when v_video_id like 'row-%' then substr(v_video_id, 5)
      else split_part(v_video_id, '-', 1)
    end;

    -- تحقق إن الجزء ده رقمي فعلاً قبل التحويل، عشان لو video_id مش بالصيغة
    -- المتوقعة (مش مفروض يحصل من الواجهة، لكن الدالة دي بتاخد نص حر) مايبوظش
    -- الرد كله بـ exception غير متوقع.
    if v_row_id_text ~ '^[0-9]+$' then
      v_row_id := v_row_id_text::bigint;
      select course_id into v_course_id from public.playlists where id = v_row_id;
    end if;

    v_link_url := case when v_course_id is not null then '/courses/' || v_course_id else null end;

    insert into public.notifications (user_id, type, title, link_url)
    values (v_asker_id, 'qa_reply', 'حد رد على سؤالك تحت المحاضرة', v_link_url);
  end if;

  return v_id;
end;
$$;

-- ============================================
-- تحديث check_and_unlock_achievements (من achievements_setup.sql): نفس
-- المنطق الأصلي بالحرف + إشعار وقت فتح إنجاز جديد فعليًا بس (مش كل مرة
-- الشرط بيتحقق لو كان مفتوح بالفعل). بنعتمد على returning من الـ insert
-- نفسه: لو on conflict امتنع الإدراج، returning بترجع صفر صفوف والمتغيّر
-- بيبقى null تلقائيًا (سلوك موثّق في Postgres)، فمفيش داعي نصفّره يدويًا
-- قبل كل شرط.
-- ============================================
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
  v_new_id uuid;
begin
  select coalesce(sum(pomodoro_minutes), 0), coalesce(sum(sessions_count), 0)
    into v_total_pomodoro_minutes, v_total_sessions
    from public.daily_activity
    where user_id = p_user_id;

  if v_total_sessions >= 1 then
    insert into public.user_achievements (user_id, achievement_key)
    values (p_user_id, 'first_step')
    on conflict (user_id, achievement_key) do nothing
    returning id into v_new_id;

    if v_new_id is not null then
      insert into public.notifications (user_id, type, title, link_url)
      values (p_user_id, 'achievement', 'فتحت إنجاز جديد: أول خطوة 📚', '/profile');
    end if;
  end if;

  if v_total_sessions >= 10 then
    insert into public.user_achievements (user_id, achievement_key)
    values (p_user_id, 'ten_sessions')
    on conflict (user_id, achievement_key) do nothing
    returning id into v_new_id;

    if v_new_id is not null then
      insert into public.notifications (user_id, type, title, link_url)
      values (p_user_id, 'achievement', 'فتحت إنجاز جديد: 10 جلسات 🎯', '/profile');
    end if;
  end if;

  if v_total_pomodoro_minutes >= 100 then
    insert into public.user_achievements (user_id, achievement_key)
    values (p_user_id, 'hundred_minutes')
    on conflict (user_id, achievement_key) do nothing
    returning id into v_new_id;

    if v_new_id is not null then
      insert into public.notifications (user_id, type, title, link_url)
      values (p_user_id, 'achievement', 'فتحت إنجاز جديد: 100 دقيقة تركيز ⏱️', '/profile');
    end if;
  end if;

  if p_is_night then
    insert into public.user_achievements (user_id, achievement_key)
    values (p_user_id, 'night_owl')
    on conflict (user_id, achievement_key) do nothing
    returning id into v_new_id;

    if v_new_id is not null then
      insert into public.notifications (user_id, type, title, link_url)
      values (p_user_id, 'achievement', 'فتحت إنجاز جديد: مذاكرة ليلية 🌙', '/profile');
    end if;
  end if;

  select count(*) into v_streak_days
    from public.daily_activity
    where user_id = p_user_id
      and activity_date > current_date - 7
      and activity_date <= current_date;

  if v_streak_days >= 7 then
    insert into public.user_achievements (user_id, achievement_key)
    values (p_user_id, 'week_streak')
    on conflict (user_id, achievement_key) do nothing
    returning id into v_new_id;

    if v_new_id is not null then
      insert into public.notifications (user_id, type, title, link_url)
      values (p_user_id, 'achievement', 'فتحت إنجاز جديد: أسبوع متواصل 🔥', '/profile');
    end if;
  end if;
end;
$$;

-- ============================================
-- تذكير عدم النشاط: بيتحسب وقت تسجيل الدخول فعليًا (بينادَى من صفحة
-- /login بعد نجاح signInWithPassword)، مش عن طريق مهمة مجدولة خلفية.
-- بيتفادى تكرار نفس التذكير لو المستخدم دخل أكتر من مرة في نفس الفترة
-- وهو لسه مش نشط، عن طريق التحقق من عدم وجود تذكير مشابه في آخر 24 ساعة.
-- ============================================
create or replace function public.check_inactivity_reminder()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last_activity date;
  v_already_notified boolean;
begin
  if auth.uid() is null then
    return;
  end if;

  select max(activity_date) into v_last_activity
    from public.daily_activity
    where user_id = auth.uid();

  -- لو مفيش نشاط خالص من الأول (حساب جديد) مش هنبعت تذكير — الشرط ده
  -- خاص بمستخدم كان نشط قبل كده وبعد عن المنصة، مش أول استخدام.
  if v_last_activity is not null and v_last_activity <= current_date - 3 then
    select exists (
      select 1 from public.notifications
      where user_id = auth.uid()
        and type = 'inactivity_reminder'
        and created_at > now() - interval '24 hours'
    ) into v_already_notified;

    if not v_already_notified then
      insert into public.notifications (user_id, type, title, link_url)
      values (auth.uid(), 'inactivity_reminder', 'وحشتنا! رجّع تذاكر معانا 👋', '/');
    end if;
  end if;
end;
$$;

grant execute on function public.check_inactivity_reminder() to authenticated;
