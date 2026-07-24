-- ============================================
-- إضافة مستوى "الترم" بين السنة والمادة
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل auth_setup.sql، لأنه بيعتمد على دالة is_admin())
-- ============================================

create table if not exists terms (
  id bigint generated always as identity primary key,
  year_id bigint not null references years (id) on delete cascade,
  term_number smallint not null check (term_number in (1, 2)),
  name text not null,
  created_at timestamptz not null default now(),
  unique (year_id, term_number)
);

create index if not exists idx_terms_year_id on terms (year_id);

alter table terms enable row level security;

create policy "Public can read terms" on terms
  for select using (true);

create policy "Admins can manage terms" on terms
  for all using (is_admin()) with check (is_admin());

-- إنشاء ترمين لكل سنة موجودة حاليًا تلقائيًا
insert into terms (year_id, term_number, name)
select id, 1, 'الترم الأول' from years
union all
select id, 2, 'الترم الثاني' from years
on conflict (year_id, term_number) do nothing;

-- ربط جدول courses بالترم بدل السنة مباشرة
alter table courses add column if not exists term_id bigint references terms (id) on delete cascade;
create index if not exists idx_courses_term_id on courses (term_id);

-- ترحيل المواد الموجودة حاليًا: كل مادة قديمة تتحط تلقائيًا في "الترم الأول" بتاع سنتها
-- (الأدمن يقدر ينقلها للترم الصح بعدين من لوحة التحكم لو محتاجة)
update courses c
set term_id = t.id
from terms t
where c.year_id = t.year_id
  and t.term_number = 1
  and c.term_id is null;
