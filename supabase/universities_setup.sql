-- ============================================
-- إضافة مستوى "الجامعة" فوق السنين الدراسية
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل auth_setup.sql و terms_setup.sql، لأنه بيعتمد على
-- دالة is_admin() وجدول terms)
-- ============================================

-- 1) جدول الجامعات
create table if not exists universities (
  id bigint generated always as identity primary key,
  name text not null unique,
  logo_url text,
  description text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

alter table universities enable row level security;

create policy "Public can read universities" on universities
  for select using (true);

create policy "Admins can manage universities" on universities
  for all using (is_admin()) with check (is_admin());

-- 2) ربط جدول years الموجود بالجامعة
alter table years add column if not exists university_id bigint references universities (id) on delete cascade;

-- 3) إنشاء الجامعة الحالية (اللي كانت الوحيدة) وربط سنينها الأربعة الموجودة بيها
-- (لازم يحصل قبل إنشاء الـ trigger تحت عشان الـ trigger مايعملش لها فرق جديدة مكررة)
insert into universities (name, order_index)
values ('جامعة المنيا الأهلية', 0)
on conflict (name) do nothing;

update years
set university_id = (select id from universities where name = 'جامعة المنيا الأهلية' limit 1)
where university_id is null;

-- 4) تعديل قيد التفرد: السنة الفريدة بقت (جامعة + رقم فرقة) بدل رقم الفرقة لوحده
alter table years drop constraint if exists years_year_number_key;
alter table years add constraint years_university_year_unique unique (university_id, year_number);

-- 5) دالة + trigger: أي جامعة جديدة تتضاف (من هنا أو من لوحة التحكم) تاخد
-- تلقائيًا 4 فرق دراسية بأسمائها القياسية وترمين لكل فرقة.
-- استخدمنا trigger بدل ما نكرر المنطق في كود الـ admin panel عشان يشتغل
-- بنفس الضمان (atomic، وجزء من نفس الـ transaction بتاعة الإضافة) مهما كان
-- مصدر الإضافة (لوحة التحكم، SQL يدوي، أي سكريبت مستقبلي) — بنفس فكرة
-- trigger على_auth_user_created الموجود في auth_setup.sql.
create or replace function handle_new_university()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_year record;
begin
  for new_year in
    insert into years (university_id, year_number, name)
    values
      (new.id, 1, 'الفرقة الأولى'),
      (new.id, 2, 'الفرقة الثانية'),
      (new.id, 3, 'الفرقة الثالثة'),
      (new.id, 4, 'الفرقة الرابعة')
    returning id
  loop
    insert into terms (year_id, term_number, name)
    values
      (new_year.id, 1, 'الترم الأول'),
      (new_year.id, 2, 'الترم الثاني');
  end loop;

  return new;
end;
$$;

drop trigger if exists on_university_created on universities;
create trigger on_university_created
  after insert on universities
  for each row execute function handle_new_university();

-- 6) إضافة الجامعتين الجديدتين — الـ trigger فوق هيعمل لهم تلقائيًا
-- 4 فرق دراسية وترمين لكل فرقة (يعني مفيش داعي لأي insert يدوي زيادة).
insert into universities (name, order_index) values
  ('جامعة المنيا الحكومية', 1),
  ('جامعة اللوتس', 2)
on conflict (name) do nothing;
