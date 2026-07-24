-- ============================================
-- قاعدة بيانات منصة جامعة المنيا الاهلية
-- الجداول: years -> courses -> books / playlists
-- ============================================

-- 1) جدول السنين الدراسية
create table if not exists years (
  id bigint generated always as identity primary key,
  year_number smallint not null unique check (year_number between 1 and 4),
  name text not null,
  created_at timestamptz not null default now()
);

-- 2) جدول المواد (كل مادة مرتبطة بسنة دراسية)
create table if not exists courses (
  id bigint generated always as identity primary key,
  year_id bigint not null references years (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

-- 3) جدول الكتب (كل كتاب مرتبط بمادة)
create table if not exists books (
  id bigint generated always as identity primary key,
  course_id bigint not null references courses (id) on delete cascade,
  title text not null,
  author text,
  file_url text,
  created_at timestamptz not null default now()
);

-- 4) جدول قوايم اليوتيوب (كل قايمة مرتبطة بمادة)
create table if not exists playlists (
  id bigint generated always as identity primary key,
  course_id bigint not null references courses (id) on delete cascade,
  title text not null,
  youtube_url text not null,
  created_at timestamptz not null default now()
);

-- إندكسات على أعمدة الـ foreign key لتسريع الاستعلامات
create index if not exists idx_courses_year_id on courses (year_id);
create index if not exists idx_books_course_id on books (course_id);
create index if not exists idx_playlists_course_id on playlists (course_id);

-- تفعيل Row Level Security (مطلوب في Supabase لأي جدول هيتقرأ من الموقع)
alter table years enable row level security;
alter table courses enable row level security;
alter table books enable row level security;
alter table playlists enable row level security;

-- سماح للجميع بالقراءة فقط (الموقع بيعرض المحتوى للزوار والطلاب)
create policy "Public can read years" on years for select using (true);
create policy "Public can read courses" on courses for select using (true);
create policy "Public can read books" on books for select using (true);
create policy "Public can read playlists" on playlists for select using (true);

-- تعبئة السنين الدراسية الأربعة
insert into years (year_number, name) values
  (1, 'الفرقة الأولى'),
  (2, 'الفرقة الثانية'),
  (3, 'الفرقة الثالثة'),
  (4, 'الفرقة الرابعة')
on conflict (year_number) do nothing;
