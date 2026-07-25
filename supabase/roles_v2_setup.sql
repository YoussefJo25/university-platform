-- ============================================
-- نظام أدوار 3 مستويات: student / year_admin / super_admin
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل auth_setup.sql و universities_setup.sql، لأنه بيعتمد على
-- جدول profiles ودالة is_admin() وجدول years)
-- ============================================

-- 1) توسيع نطاق الأدوار المسموحة، وترحيل 'admin' القديم لـ 'super_admin'
alter table profiles drop constraint if exists profiles_role_check;
update profiles set role = 'super_admin' where role = 'admin';
alter table profiles add constraint profiles_role_check
  check (role in ('student', 'year_admin', 'super_admin'));

-- 2) جدول ربط: أدمن الفرقة ممكن يدير أكتر من فرقة
create table if not exists year_managers (
  id bigint generated always as identity primary key,
  profile_id uuid not null references profiles (id) on delete cascade,
  year_id bigint not null references years (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (profile_id, year_id)
);

create index if not exists idx_year_managers_profile_id on year_managers (profile_id);
create index if not exists idx_year_managers_year_id on year_managers (year_id);

alter table year_managers enable row level security;

-- 3) دالة: هل المستخدم الحالي super_admin؟
create or replace function is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'super_admin'
  );
$$;

-- 4) دالة: هل المستخدم الحالي مسؤول (بأي مستوى) عن فرقة معينة؟
create or replace function is_year_manager(target_year_id bigint)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select is_super_admin() or exists (
    select 1 from year_managers
    where profile_id = auth.uid() and year_id = target_year_id
  );
$$;

-- 5) is_admin() القديمة بقت alias لـ is_super_admin()، عشان أي سياسة قديمة
-- لسه مستخدمة is_admin() (زي universities/terms/site_settings/leadership)
-- تفضل شغالة بمعنى "أدمن أعلى" من غير ما نلمسها.
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select is_super_admin();
$$;

-- 6) سياسات year_managers
-- الأدمن الأعلى بيدير كل تعيينات أدمن الفرق (تعيين/إلغاء/قراءة الكل)
create policy "Super admins can manage year_managers" on year_managers
  for all using (is_super_admin()) with check (is_super_admin());

-- أدمن الفرقة يقدر يشوف تعييناته هو بس (عشان يعرف الفرق اللي بيديرها)
create policy "Year admins can see their own assignments" on year_managers
  for select using (profile_id = auth.uid());

-- 7) الأدمن الأعلى يقدر يقرأ بروفايلات كل المستخدمين (لتاب "المستخدمين")
-- (سياسة "Users can read their own profile" الموجودة فضلة زي ما هي لباقي المستخدمين)
create policy "Super admins can read all profiles" on profiles
  for select using (is_super_admin());

-- 8) RPC functions لتعيين/إلغاء أدمن فرقة — كل تغيير في profiles.role
-- و year_managers لازم يعدي من هنا بس (مش UPDATE مباشر من الكود)، عشان:
--   - نمنع نهائيًا (على مستوى قاعدة البيانات، مش بس الواجهة) أي تعديل
--     لدور super_admin حتى لو حصل غلط في كود الواجهة
--   - نضمن إن role بيرجع 'student' تلقائيًا لما آخر تعيين يتلغي، من غير
--     ما نعتمد على الكود الأمامي يعمل الخطوتين (حذف من year_managers +
--     تحديث role) بشكل متزامن ومتسق
create or replace function assign_year_admin(target_profile_id uuid, target_year_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role text;
begin
  if not is_super_admin() then
    raise exception 'غير مصرح لك بتعيين أدمن فرقة';
  end if;

  select role into target_role from profiles where id = target_profile_id;

  if target_role is null then
    raise exception 'المستخدم غير موجود';
  end if;

  if target_role = 'super_admin' then
    raise exception 'لا يمكن تعديل دور أدمن أعلى';
  end if;

  insert into year_managers (profile_id, year_id)
  values (target_profile_id, target_year_id)
  on conflict (profile_id, year_id) do nothing;

  update profiles set role = 'year_admin' where id = target_profile_id and role = 'student';
end;
$$;

create or replace function unassign_year_admin(target_profile_id uuid, target_year_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role text;
  remaining_count int;
begin
  if not is_super_admin() then
    raise exception 'غير مصرح لك بإلغاء تعيين أدمن فرقة';
  end if;

  select role into target_role from profiles where id = target_profile_id;

  if target_role = 'super_admin' then
    raise exception 'لا يمكن تعديل دور أدمن أعلى';
  end if;

  delete from year_managers where profile_id = target_profile_id and year_id = target_year_id;

  select count(*) into remaining_count from year_managers where profile_id = target_profile_id;

  if remaining_count = 0 then
    update profiles set role = 'student' where id = target_profile_id and role = 'year_admin';
  end if;
end;
$$;
