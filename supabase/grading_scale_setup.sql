-- ============================================
-- نظام تقييم قابل للتخصيص لكل جامعة (Grading Scale) — يربط حاسبة المعدل
-- بدرجة رقمية من 100 بدل اختيار حرف مباشر
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل universities_setup.sql, roles_v2_setup.sql,
-- gpa_calculator_setup.sql)
--
-- تصحيح مهم عن الكود المقترح: universities.id من نوع bigint (identity)
-- مش uuid — الجدول هنا بيستخدم bigint عشان الـ foreign key يشتغل فعليًا.
-- ============================================

create table if not exists public.grading_scales (
  id uuid primary key default gen_random_uuid(),
  university_id bigint references public.universities(id) on delete cascade not null,
  min_score numeric not null,   -- الحد الأدنى للنطاق (شامل)
  max_score numeric not null,   -- الحد الأقصى للنطاق (غير شامل، إلا أعلى نطاق بيوصل لـ100 فبيبقى شامل)
  letter_grade text not null,   -- مثال: 'B+', 'C-', إلخ
  grade_point numeric not null, -- مثال: 3.30
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists grading_scales_university_id_idx on public.grading_scales (university_id);

alter table public.grading_scales enable row level security;

create policy "Public can read grading_scales" on public.grading_scales
  for select using (true);

create policy "Super admins can manage grading_scales" on public.grading_scales
  for all using (is_super_admin()) with check (is_super_admin());

-- الحاسبة دلوقتي بتاخد درجة رقمية من 100 بدل اختيار حرف مباشر، فمحتاجين
-- نخزّن الرقم الخام مع كل صف (مش بس الحرف الناتج) — عشان لو الأدمن غيّر
-- نطاقات الجامعة بعدين، الحسبة المحفوظة القديمة تفضل قابلة للعرض بدرجتها
-- الأصلية بدل ما تتفسّر غلط. عمود grade الحالي فضل زي ما هو (بيتخزن فيه
-- الحرف الناتج وقت الحفظ) للتوافق مع الكود القديم.
alter table public.gpa_entries add column if not exists score numeric;

-- ============================================
-- بيانات ابتدائية (seed) لجامعة المنيا الأهلية بس
--
-- 5 نطاقات مؤكدة من المستخدم بالظبط: B+, C, C-, D, D-.
-- باقي النطاقات (A, A-, B, C+, D+, F) اتحسبت بمنطق متدرّج منتظم (خطوة
-- 5 درجات لكل نطاق، ونفس نمط 0.3 نقطة الفرق بين الدرجات المستخدم في باقي
-- الحاسبة) عشان تغطي 0-100 بالكامل من غير فجوة ولا تداخل مع النطاقات
-- المؤكدة. **لازم مراجعتها وتعديلها يدويًا من لوحة التحكم إن لزم.**
--
-- الجدول الكامل الناتج (شامل من الأدنى، غير شامل من الأعلى إلا A):
--   A   : 95–100   (شامل الطرفين)   -- تقريبي: يحتاج مراجعة وتعديل يدوي من الأدمن
--   A-  : 90–<95                    -- تقريبي: يحتاج مراجعة وتعديل يدوي من الأدمن
--   B+  : 85–<90                    -- مؤكد من المستخدم
--   B   : 80–<85                    -- تقريبي: يحتاج مراجعة وتعديل يدوي من الأدمن
--   C+  : 75–<80                    -- تقريبي: يحتاج مراجعة وتعديل يدوي من الأدمن
--   C   : 70–<75                    -- مؤكد من المستخدم
--   C-  : 65–<70                    -- مؤكد من المستخدم
--   D+  : 60–<65                    -- تقريبي: يحتاج مراجعة وتعديل يدوي من الأدمن
--   D   : 58–<60                    -- مؤكد من المستخدم (59 و58 نطاق واحد)
--   D-  : 53–<58                    -- مؤكد من المستخدم
--   F   : 0–<53                     -- تقريبي: يحتاج مراجعة وتعديل يدوي من الأدمن
-- ============================================

insert into public.grading_scales (university_id, min_score, max_score, letter_grade, grade_point, display_order)
select u.id, scale.min_score, scale.max_score, scale.letter_grade, scale.grade_point, scale.display_order
from public.universities u,
  (values
    (95::numeric, 100::numeric, 'A', 4.00::numeric, 1),
    (90::numeric, 95::numeric, 'A-', 3.70::numeric, 2),
    (85::numeric, 90::numeric, 'B+', 3.30::numeric, 3),
    (80::numeric, 85::numeric, 'B', 3.00::numeric, 4),
    (75::numeric, 80::numeric, 'C+', 2.30::numeric, 5),
    (70::numeric, 75::numeric, 'C', 2.00::numeric, 6),
    (65::numeric, 70::numeric, 'C-', 1.70::numeric, 7),
    (60::numeric, 65::numeric, 'D+', 1.30::numeric, 8),
    (58::numeric, 60::numeric, 'D', 1.00::numeric, 9),
    (53::numeric, 58::numeric, 'D-', 0.70::numeric, 10),
    (0::numeric, 53::numeric, 'F', 0.00::numeric, 11)
  ) as scale(min_score, max_score, letter_grade, grade_point, display_order)
where u.name = 'جامعة المنيا الأهلية'
  and not exists (
    select 1 from public.grading_scales gs where gs.university_id = u.id
  );
