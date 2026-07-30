-- ============================================
-- تطوير حاسبة تقدير المعدل: سجل أكاديمي سابق + مواد معادة
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل gpa_calculator_setup.sql)
-- ============================================

-- 1) خيار "معادة" لكل مادة — بيغيّر طريقة حساب المعدل التراكمي (مش
-- الفصلي) بس: ساعاتها منضافش تاني لإجمالي الساعات التراكمية (مفروض
-- محسوبة أصلاً في prior_attempted_hours تحت)، لكن درجتها الجديدة بتدخل
-- في حساب نقاط الجودة زي أي مادة عادية.
alter table public.gpa_entries add column if not exists is_retake boolean not null default false;

-- 2) السجل الأكاديمي السابق — صف واحد لكل مستخدم، بيمثّل وضعه قبل
-- الفصل الحالي، عشان نقدر ندمجه مع نتيجة الفصل ده في معدل تراكمي واحد.
create table if not exists public.gpa_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  prior_attempted_hours numeric not null default 0,
  prior_cgpa numeric not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.gpa_profile enable row level security;

create policy "Users manage their own gpa_profile" on public.gpa_profile
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
