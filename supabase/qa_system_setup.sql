-- ============================================
-- نظام الأسئلة والأجوبة تحت كل محاضرة (Q&A)
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل roles_v2_setup.sql و personal_notes_setup.sql)
--
-- video_id: نفس صيغة content_id النصية المستخدمة في ميزة الملاحظات
-- الشخصية (personal_notes_setup.sql) — "${playlists.id}-${youtubeVideoId}"
-- أو "row-${playlists.id}" — مش bigint ولا uuid بسيط، لنفس السبب: هوية
-- الفيديو في الكود مركّبة مش رقم صف واحد.
--
-- اسم السائل/المجيب وعلامة "إجابة رسمية": بدل ما نسيب الـ client يبعت
-- الاسم أو حالة الأدمن مع كل insert (ده كان هيسمح لأي طالب يزوّر اسمه أو
-- يحط نفسه "إجابة رسمية" بمجرد ما يبعت true من المتصفح — RLS بتتحقق من
-- auth.uid() بس مش من صحة باقي الأعمدة)، الكتابة كلها بتتم عن طريق دالتين
-- (security definer) بتاخدوا الاسم والدور الفعلي من profiles على السيرفر
-- نفسه، فمفيش أي طريق تاني يوصل بيه المستخدم للجدول مباشرة عشان يزوّر أي
-- قيمة. نفس فلسفة record_heartbeat/record_pomodoro_minutes.
-- ============================================

create table if not exists public.video_questions (
  id uuid primary key default gen_random_uuid(),
  video_id text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  asker_name text not null,
  question_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.video_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.video_questions(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  answerer_name text not null,
  is_staff_answer boolean not null default false,
  answer_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists video_questions_video_id_idx on public.video_questions (video_id);
create index if not exists video_answers_question_id_idx on public.video_answers (question_id);

alter table public.video_questions enable row level security;
alter table public.video_answers enable row level security;

-- أي مستخدم مسجل دخول يقدر يقرا كل الأسئلة/الردود (مجتمع مفتوح تحت كل
-- فيديو، مش خاص زي personal_notes)
create policy "Signed-in users can read video_questions" on public.video_questions
  for select using (auth.uid() is not null);

create policy "Signed-in users can read video_answers" on public.video_answers
  for select using (auth.uid() is not null);

-- مفيش insert policy على الجدولين عمدًا — الكتابة الوحيدة عن طريق الدالتين
-- تحت. الحذف بس (إشراف) مسموح لـ super_admin.
create policy "Super admins can delete video_questions" on public.video_questions
  for delete using (is_super_admin());

create policy "Super admins can delete video_answers" on public.video_answers
  for delete using (is_super_admin());

create or replace function public.ask_video_question(p_video_id text, p_question_text text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول لطرح سؤال';
  end if;

  select coalesce(nullif(trim(full_name), ''), split_part(email, '@', 1), 'مستخدم')
    into v_display_name
    from public.profiles
    where id = auth.uid();

  insert into public.video_questions (video_id, user_id, asker_name, question_text)
  values (p_video_id, auth.uid(), coalesce(v_display_name, 'مستخدم'), p_question_text)
  returning id into v_id;

  return v_id;
end;
$$;

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

  return v_id;
end;
$$;

grant execute on function public.ask_video_question(text, text) to authenticated;
grant execute on function public.post_video_answer(uuid, text) to authenticated;
