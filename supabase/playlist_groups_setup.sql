-- ============================================
-- تجميع قوايم التشغيل تحت نفس الاسم/المصدر
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- ============================================

-- عمود جديد لتجميع أكتر من صف playlist تحت نفس "الاسم/المصدر"
alter table playlists add column if not exists group_name text;
create index if not exists idx_playlists_group_name on playlists (course_id, group_name);
