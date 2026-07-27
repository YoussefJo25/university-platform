-- ============================================
-- ترتيب يدوي للمواد/الأقسام تحت نفس الأب (سواء أقسام فرعية تحت مسار
-- تعلم برمجة، أو مواد تحت نفس الترم الأكاديمي)
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- ============================================

alter table courses add column if not exists order_index integer not null default 0;
create index if not exists idx_courses_order_index on courses (parent_course_id, order_index);
