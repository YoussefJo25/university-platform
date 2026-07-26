-- ============================================
-- إحصائيات بسيطة: عدد زيارات كل مادة/مسار
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- ============================================

alter table courses add column if not exists view_count bigint not null default 0;

create or replace function increment_course_views(target_course_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update courses set view_count = view_count + 1 where id = target_course_id;
end;
$$;
