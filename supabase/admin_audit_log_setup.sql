-- ============================================
-- سجل النشاط الإداري
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل roles_v2_setup.sql، لأنه بيعتمد على دالة is_super_admin()
-- وجدول profiles)
-- ============================================

create table if not exists admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles (id) on delete set null,
  actor_name text not null,
  action_type text not null,
  target_description text not null,
  created_at timestamptz not null default now()
);

alter table admin_audit_log enable row level security;

create policy "Super admins can read audit log" on admin_audit_log
  for select using (is_super_admin());

create policy "Super admins can insert audit log" on admin_audit_log
  for insert with check (is_super_admin());
