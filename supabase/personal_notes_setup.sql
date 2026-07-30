-- ============================================
-- ملاحظات شخصية على المحتوى (فيديو/كتاب)
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل auth_setup.sql)
--
-- تصحيح مهم عن الكود المقترح (اكتشفته بعد مراجعة الكود الفعلي، مش مجرد
-- bigint بدل uuid زي المرة اللي فاتت):
--
-- books.id فعلاً bigint عادي، لكن الفيديوهات مالهاش رقم بسيط زي كده —
-- هوية الفيديو في الكود الحالي (VideoItem.id في app/courses/[id]/page.tsx)
-- عبارة عن نص مركّب:
--   - "${row.id}-${youtubeVideoId}"  لو الفيديو جزء من playlist اتوسّعت
--     لعدة فيديوهات حقيقية (كل فيديو فيها له نفس صف playlists.id، فمينفعش
--     نستخدم رقم الصف لوحده وإلا كل فيديوهات الـplaylist هيشتركوا في
--     ملاحظة واحدة غلط)
--   - "row-${row.id}"  لو الفيديو مفرد مش playlist
--
-- عشان كده content_id هنا نوعه **text** (مش bigint ولا uuid) — بيستوعب
-- المعرف المركّب للفيديوهات، وبنحوّل رقم الكتاب لنص عادي وقت الحفظ.
-- ============================================

create table if not exists public.personal_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  content_type text not null, -- 'video' | 'book'
  content_id text not null,
  note_text text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id, content_type, content_id)
);

create index if not exists personal_notes_user_id_idx on public.personal_notes (user_id);

alter table public.personal_notes enable row level security;

create policy "Users manage their own personal_notes" on public.personal_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
