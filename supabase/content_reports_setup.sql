-- ============================================
-- الإبلاغ عن مشكلة (رابط معطّل / محتوى غير صحيح) في فيديو أو كتاب
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل roles_v2_setup.sql، لأنه بيعتمد على دالة is_super_admin())
--
-- ⚠️ سياسة الـ select المقترحة في الطلب فيها مشكلتين حقيقيتين، فبسّطناها:
--   1) is_super_admin() كانت متكررة مرتين في نفس شرط الـ OR (نسخ ولزق).
--   2) الشرط item_type = 'course' كان بيمنع year_admin من شوفان بلاغات
--      الفيديوهات/الكتب أصلًا (وهي الاستخدام الأساسي والوحيد فعليًا من
--      الواجهة) — عمليًا مفيش داعي لأي شرط على item_type خالص.
-- بدل ما نصلّح الشرط ونعقّده أكتر، طبّقنا اقتراحك التاني: خليناها
-- super_admin بس مبدئيًا (زي "سجل النشاط" بالظبط)، وسهل نوسّعها لـ
-- year_admin لاحقًا لو احتجتوا ده.
-- ============================================

create table if not exists content_reports (
  id bigint generated always as identity primary key,
  course_id bigint not null references courses (id) on delete cascade,
  item_type text not null check (item_type in ('video', 'book', 'course')),
  item_title text not null,
  issue_type text not null check (issue_type in ('broken_link', 'wrong_content', 'other')),
  description text,
  reporter_id uuid references profiles (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

alter table content_reports enable row level security;

-- أي مستخدم مسجّل دخول يقدر يبلّغ، بس لازم ينسب البلاغ لنفسه (أو من غير
-- ما ينسبه لحد أصلًا) — مش يقدر يزوّر reporter_id بحساب حد تاني.
create policy "Authenticated users can create reports" on content_reports
  for insert with check (
    auth.uid() is not null and (reporter_id = auth.uid() or reporter_id is null)
  );

create policy "Super admins can read reports" on content_reports
  for select using (is_super_admin());

create policy "Super admins can update reports" on content_reports
  for update using (is_super_admin()) with check (is_super_admin());
