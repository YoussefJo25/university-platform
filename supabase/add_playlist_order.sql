-- ============================================
-- إضافة عمود ترتيب الفيديوهات لجدول playlists
-- ============================================

alter table playlists
  add column if not exists order_index integer not null default 0;

create index if not exists idx_playlists_course_order
  on playlists (course_id, order_index);
