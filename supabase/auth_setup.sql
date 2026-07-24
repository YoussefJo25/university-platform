-- ============================================
-- نظام تسجيل الدخول والأدوار (Admin / Student)
-- ============================================

-- 1) جدول البروفايلات، مربوط بجدول auth.users الخاص بـ Supabase
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- كل مستخدم يقدر يقرأ بروفايله بس
create policy "Users can read their own profile" on profiles
  for select using (auth.uid() = id);

-- 2) عند إنشاء حساب جديد في auth.users يتضاف صف تلقائيًا في profiles
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 3) دالة مساعدة بتتأكد إن المستخدم الحالي أدمن (تُستخدم داخل سياسات RLS)
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 4) سياسات الكتابة: الأدمن بس يقدر يضيف/يعدل/يحذف
create policy "Admins can insert courses" on courses
  for insert with check (is_admin());
create policy "Admins can update courses" on courses
  for update using (is_admin());
create policy "Admins can delete courses" on courses
  for delete using (is_admin());

create policy "Admins can insert books" on books
  for insert with check (is_admin());
create policy "Admins can update books" on books
  for update using (is_admin());
create policy "Admins can delete books" on books
  for delete using (is_admin());

create policy "Admins can insert playlists" on playlists
  for insert with check (is_admin());
create policy "Admins can update playlists" on playlists
  for update using (is_admin());
create policy "Admins can delete playlists" on playlists
  for delete using (is_admin());

-- ============================================
-- ترقية أول حساب أدمن يدويًا
-- بعد ما تعمل إنشاء حساب عادي من صفحة /login، شغّل الأمر ده
-- في SQL editor بتاع Supabase (غيّر الإيميل بإيميلك):
--
--   update profiles set role = 'admin' where email = 'your-email@example.com';
-- ============================================
