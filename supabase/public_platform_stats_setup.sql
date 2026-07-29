-- ============================================
-- إحصائيات عامة مبسطة للصفحة الرئيسية (زوار مش مسجلين دخول)
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل content_stats_setup.sql و universities_setup.sql
-- و roles_v2_setup.sql)
--
-- زي public_course_previews_setup.sql، بس هنا حتى أضيق: الدالة دي بترجع
-- 3 أرقام إجمالية بس (مفيش أي صف/عمود خام من profiles أو courses أو
-- universities)، فمفيش أي احتمال تسريب بيانات شخصية أو محتوى تفصيلي —
-- security definer بنفس نمط باقي دوال الإحصائيات (get_daily_visit_counts
-- وغيرها)، وبتتخطى RLS الأصلية لأنها بتحسب أرقام إجمالية بس مش بتكشف صفوف.
-- ============================================

create or replace function get_public_platform_stats()
returns table (total_views bigint, total_students bigint, total_universities bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    (select coalesce(sum(view_count), 0) from courses) as total_views,
    (select count(*) from profiles where role = 'student') as total_students,
    (select count(*) from universities) as total_universities;
$$;

grant execute on function get_public_platform_stats() to anon, authenticated;
