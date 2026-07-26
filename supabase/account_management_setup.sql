-- ============================================
-- إدارة الحسابات: تعديل، حذف، تعطيل/تفعيل + تسجيلها في سجل النشاط
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل roles_v2_setup.sql و admin_audit_log_setup.sql، لأنه بيعتمد
-- على is_super_admin() وجدول admin_audit_log)
-- ============================================

-- 1) الأدمن الأعلى يقدر يعدّل أي بروفايل (سياسة إضافية فوق "Users can
-- update their own profile" الموجودة بالفعل — الاتنين permissive فبيتحدوا
-- بـ OR، مش بيلغوا بعض). الكود بيبعت full_name/phone/university_id/year_id
-- بس عند التعديل، مش الإيميل أو role — التقييد ده على مستوى الواجهة زي ما
-- هو مكتوب في lib، مش عمود مقفول في القاعدة.
create policy "Super admins can update any profile" on profiles
  for update using (is_super_admin()) with check (is_super_admin());

-- 2) تعطيل/تفعيل حساب
alter table profiles add column if not exists is_active boolean not null default true;

-- 3) حذف حساب نهائيًا — لازم RPC (مش UPDATE/DELETE مباشر من الكود) عشان
-- حذف auth.users محتاج صلاحيات أعلى من مفتاح anon العادي، وعشان نضمن على
-- مستوى القاعدة إن محدش يقدر يحذف نفسه أو يحذف super_admin تاني حتى لو
-- في خطأ في كود الواجهة.
create or replace function admin_delete_user(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  target_name text; 
begin
  if not is_super_admin() then
    raise exception 'Unauthorized: only super_admin can delete users';
  end if;
  if target_id = auth.uid() then
    raise exception 'Cannot delete your own account';
  end if;
  if exists (select 1 from profiles where id = target_id and role = 'super_admin') then
    raise exception 'Cannot delete a super_admin account';
  end if;
  select coalesce(full_name, email) into target_name from profiles where id = target_id;
  select coalesce(full_name, email) into actor_name from profiles where id = auth.uid();
  insert into admin_audit_log (actor_id, actor_name, action_type, target_description)
  values (auth.uid(), actor_name, 'delete_user', target_name);
  delete from auth.users where id = target_id;
end;
$$;

-- 4) نفس اتنين الدوال القديمة (تعيين/إلغاء أدمن فرقة)، بإضافة تسجيل
-- الحدث في admin_audit_log في الآخر — باقي المنطق زي ما هو بالظبط.
create or replace function assign_year_admin(target_profile_id uuid, target_year_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role text;
  actor_name text;
  target_name text;
  target_year_name text;
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

  select coalesce(full_name, email) into actor_name from profiles where id = auth.uid();
  select coalesce(full_name, email) into target_name from profiles where id = target_profile_id;
  select name into target_year_name from years where id = target_year_id;

  insert into admin_audit_log (actor_id, actor_name, action_type, target_description)
  values (
    auth.uid(),
    actor_name,
    'assign_year_admin',
    target_name || ' — ' || coalesce(target_year_name, 'فرقة غير معروفة')
  );
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
  actor_name text;
  target_name text;
  target_year_name text;
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

  select coalesce(full_name, email) into actor_name from profiles where id = auth.uid();
  select coalesce(full_name, email) into target_name from profiles where id = target_profile_id;
  select name into target_year_name from years where id = target_year_id;

  insert into admin_audit_log (actor_id, actor_name, action_type, target_description)
  values (
    auth.uid(),
    actor_name,
    'unassign_year_admin',
    target_name || ' — ' || coalesce(target_year_name, 'فرقة غير معروفة')
  );
end;
$$;
