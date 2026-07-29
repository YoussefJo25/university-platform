-- ============================================
-- سجل زيارات بتاريخ (لعرض Timeline في صفحة الإحصائيات)
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل content_stats_setup.sql و roles_v2_setup.sql، لأنه بيعدّل
-- دالة increment_course_views() وبيعتمد على is_super_admin())
--
-- content_stats_setup.sql كان بيحسب زيارات كل مادة كرقم تراكمي واحد بس
-- (courses.view_count) من غير أي تاريخ — يعني مفيش طريقة نحسب بيها
-- "الزيارات آخر 7/30/90 يوم" من البيانات القديمة. الجدول ده بيضيف سطر لكل
-- زيارة بتاريخها، من دلوقتي فصاعدًا، عشان يوصف رسم بياني حقيقي بمرور
-- الوقت. الزيارات القديمة (قبل تشغيل الملف ده) هتفضل موجودة في
-- courses.view_count بس مش هيبقى ليها تاريخ.
-- ============================================

create table if not exists course_views (
  id bigint generated always as identity primary key,
  course_id bigint not null references courses (id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create index if not exists course_views_viewed_at_idx on course_views (viewed_at);
create index if not exists course_views_course_id_idx on course_views (course_id);

alter table course_views enable row level security;

create policy "Super admins can read course_views" on course_views
  for select using (is_super_admin());

-- نفس دالة increment_course_views الأصلية، بإضافة سطر في course_views مع
-- كل زيادة — باقي المنطق (تحديث العداد التراكمي) زي ما هو بالظبط عشان
-- الجداول والصفحات اللي بتعتمد على view_count الحالي يستمروا يشتغلوا من
-- غير أي تعديل.
create or replace function increment_course_views(target_course_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update courses set view_count = view_count + 1 where id = target_course_id;
  insert into course_views (course_id) values (target_course_id);
end;
$$;

-- دالة تجميع الزيارات يوم بيوم لآخر N يوم (بتتضمن الأيام اللي مفيهاش أي
-- زيارة كصفر، عشان الرسم البياني يبان متصل من غير فجوات). محصورة على
-- super_admin بس بنفس أسلوب باقي دوال الأدمن (assign_year_admin وغيرها).
create or replace function get_daily_visit_counts(days_back int)
returns table (day date, visit_count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_super_admin() then
    raise exception 'غير مصرح لك بالاطلاع على هذه البيانات';
  end if;

  return query
    select
      d::date as day,
      coalesce(count(cv.id), 0) as visit_count
    from generate_series(
      (current_date - (days_back - 1) * interval '1 day')::date,
      current_date,
      interval '1 day'
    ) as d
    left join course_views cv on cv.viewed_at::date = d::date
    group by d
    order by d;
end;
$$;
