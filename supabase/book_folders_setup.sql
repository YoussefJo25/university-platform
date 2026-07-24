-- ============================================
-- نظام فولدرات الكتب
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل auth_setup.sql، لأنه بيعتمد على دالة is_admin())
-- ============================================

-- 1) جدول الفولدرات، كل فولدر مرتبط بمادة
create table if not exists book_folders (
  id bigint generated always as identity primary key,
  course_id bigint not null references courses (id) on delete cascade,
  name text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_book_folders_course_id on book_folders (course_id);

alter table book_folders enable row level security;

create policy "Public can read book_folders" on book_folders
  for select using (true);

create policy "Admins can insert book_folders" on book_folders
  for insert with check (is_admin());
create policy "Admins can update book_folders" on book_folders
  for update using (is_admin());
create policy "Admins can delete book_folders" on book_folders
  for delete using (is_admin());

-- 2) ربط الكتب بفولدر (اختياري) بدل الارتباط المباشر بالمادة بس
-- عمود course_id القديم يفضل زي ما هو عشان الكتب القديمة تفضل شغالة
alter table books add column if not exists folder_id bigint references book_folders (id) on delete cascade;
create index if not exists idx_books_folder_id on books (folder_id);
