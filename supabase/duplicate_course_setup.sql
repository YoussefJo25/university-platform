-- ============================================
-- نسخ مادة كاملة (فيديوهات + فولدرات كتب) لمكان تاني — نسخة مستقلة
-- تمامًا عن الأصل، أي تعديل لاحق في نسخة ملهوش تأثير على التانية.
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل roles_v2_setup.sql و book_folders_setup.sql و
-- playlist_groups_setup.sql و course_order_setup.sql)
--
-- ملحوظة: الدالة دي بتنسخ صفوف courses/playlists/book_folders بس. نسخ
-- صفوف books والملفات الفعلية في Storage بيحصل من التطبيق (TypeScript)
-- بعد النداء عليها، لأن نسخ ملف حقيقي في Storage محتاج استدعاء API خاص
-- بالتخزين مش SQL بحت — شايفه في app/admin/page.tsx (DuplicateCourseModal).
-- ============================================

create or replace function duplicate_course(
  source_course_id bigint,
  new_name text,
  target_category text,
  target_year_id bigint default null,
  target_term_id bigint default null,
  target_parent_course_id bigint default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_course_id bigint;
  source_course record;
  rec record;
begin
  if not is_super_admin() then
    raise exception 'النسخ متاح لـ super_admin بس';
  end if;

  select * into source_course from courses where id = source_course_id;
  if not found then
    raise exception 'المادة المصدر غير موجودة';
  end if;

  -- إنشاء المادة الجديدة بنفس الوصف، في الوجهة المطلوبة
  insert into courses (name, description, category, year_id, term_id, parent_course_id, order_index)
  values (
    new_name,
    source_course.description,
    target_category,
    target_year_id,
    target_term_id,
    target_parent_course_id,
    source_course.order_index
  )
  returning id into new_course_id;

  -- نسخ قوايم التشغيل (فيديوهات)
  insert into playlists (course_id, title, youtube_url, group_name, order_index)
  select new_course_id, title, youtube_url, group_name, order_index
  from playlists
  where course_id = source_course_id
  order by order_index, id;

  -- نسخ الفولدرات — بترتيب ثابت (id تصاعديًا) عشان الكود في التطبيق يقدر
  -- يطابق كل فولدر قديم بالجديد المقابل له بالظبط وقت نسخ الكتب بعد كده
  -- (النداء دي بيحصل جوه transaction واحدة، فلو الدالة رجعت نجاح، كل
  -- الفولدرات دي مضمون إنها اتنسخت فعلًا بنفس الترتيب).
  for rec in
    select * from book_folders where course_id = source_course_id order by id
  loop
    insert into book_folders (course_id, name, order_index)
    values (new_course_id, rec.name, rec.order_index);
  end loop;

  return new_course_id;
end;
$$;
