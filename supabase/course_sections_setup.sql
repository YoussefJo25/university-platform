-- ============================================
-- أقسام فرعية جوه مسارات تعلم البرمجة (self-reference على courses)
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل learning_path_setup.sql)
-- ============================================

alter table courses add column if not exists parent_course_id bigint references courses (id) on delete cascade;
create index if not exists idx_courses_parent_course_id on courses (parent_course_id);
