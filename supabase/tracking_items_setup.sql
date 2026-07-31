-- ============================================
-- نظام تتبع عام وقابل للتوسيع (بديل عن whatsapp_link_sent الثابت)
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل whatsapp_link_tracking_setup.sql، لأنه بيرحّل بياناته)
--
-- الصلاحيات:
-- - tracking_items (قائمة العناصر: "واتساب"، "فيسبوك"، إلخ): القراءة لأي
--   أدمن (is_staff())، لكن الإضافة/الحذف بس لـ super_admin — لأن العناصر
--   دي إعداد على مستوى المنصة كلها مش خاص بجامعة/فرقة معينة، زي باقي
--   الإعدادات العامة (site_settings/leadership/grading_scale) اللي كلها
--   مقصورة على super_admin في الكود الحالي، مش year_admin.
-- - profile_tracking_status (حالة كل عنصر لكل طالب): القراءة والكتابة بس
--   لـ is_staff()، والطالب نفسه ميقدرش يعدّل حالته حتى لو الصف بتاعه هو
--   — القرار ده إداري مش قرار الطالب. الكتابة عن طريق دالة
--   set_tracking_status (security definer) بس، نفس فلسفة
--   set_whatsapp_link_sent قبل كده — مفيش insert/update/delete policy
--   مباشرة على الجدول خالص.
-- ============================================

create table if not exists public.tracking_items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.profile_tracking_status (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  tracking_item_id uuid not null references public.tracking_items(id) on delete cascade,
  is_done boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (profile_id, tracking_item_id)
);

create index if not exists profile_tracking_status_item_idx
  on public.profile_tracking_status (tracking_item_id);

alter table public.tracking_items enable row level security;
alter table public.profile_tracking_status enable row level security;

create policy "Staff can read tracking_items" on public.tracking_items
  for select using (is_staff());

create policy "Super admins can insert tracking_items" on public.tracking_items
  for insert with check (is_super_admin());

create policy "Super admins can delete tracking_items" on public.tracking_items
  for delete using (is_super_admin());

create policy "Staff can read profile_tracking_status" on public.profile_tracking_status
  for select using (is_staff());

create or replace function public.add_tracking_item(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not is_super_admin() then
    raise exception 'غير مسموح لك بإضافة عنصر تتبع جديد';
  end if;

  insert into public.tracking_items (name, display_order)
  values (
    trim(p_name),
    coalesce((select max(display_order) + 1 from public.tracking_items), 0)
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.set_tracking_status(
  p_profile_id uuid,
  p_tracking_item_id uuid,
  p_is_done boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_staff() then
    raise exception 'غير مسموح لك بتعديل حالة التتبع';
  end if;

  insert into public.profile_tracking_status (profile_id, tracking_item_id, is_done, updated_at)
  values (p_profile_id, p_tracking_item_id, p_is_done, now())
  on conflict (profile_id, tracking_item_id)
  do update set is_done = excluded.is_done, updated_at = now();
end;
$$;

grant execute on function public.add_tracking_item(text) to authenticated;
grant execute on function public.set_tracking_status(uuid, uuid, boolean) to authenticated;

-- ============================================
-- ترحيل بيانات whatsapp_link_sent الموجودة، عشان محدش يضيع
-- ============================================
insert into public.tracking_items (name, display_order)
values ('واتساب', -1)
on conflict (name) do nothing;

insert into public.profile_tracking_status (profile_id, tracking_item_id, is_done)
select p.id, ti.id, true
from public.profiles p
cross join public.tracking_items ti
where ti.name = 'واتساب'
  and p.whatsapp_link_sent = true
on conflict (profile_id, tracking_item_id) do nothing;

-- ملحوظة: عمود profiles.whatsapp_link_sent وdالة set_whatsapp_link_sent
-- القديمة (whatsapp_link_tracking_setup.sql) اتسيّبوا عمدًا من غير حذف —
-- الواجهة بقت تستخدم النظام الجديد بالكامل، لكن مفيش داعي نحذف حاجة من
-- قاعدة البيانات قبل ما تتأكد إن الترحيل نجح فعليًا. لما تتأكد، شغّل ده
-- في migration منفصلة (اختياري، مش جزء من الملف ده):
--   drop function if exists public.set_whatsapp_link_sent(uuid, boolean);
--   alter table public.profiles drop column if exists whatsapp_link_sent;
