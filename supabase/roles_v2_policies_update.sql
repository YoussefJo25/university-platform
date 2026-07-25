-- ============================================
-- تحديث سياسات RLS للكتابة عشان تسمح لأدمن الفرقة (year_admin) بإدارة
-- محتوى الفرق المعيّن عليها بس، جنبًا إلى جنب مع الأدمن الأعلى
-- (super_admin) اللي لسه بيقدر يدير كل حاجة في كل مكان.
--
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل roles_v2_setup.sql مباشرة، لأنه بيعتمد على دالة is_year_manager())
-- ============================================

-- دالة مساعدة: هل المستخدم الحالي يقدر يدير مادة معينة؟
-- بتتحقق إن المادة أكاديمية (مرتبطة بفرقة) ومسؤول عنها is_year_manager،
-- أو إن المستخدم super_admin أصلًا (بيقدر يدير أي حاجة زي ما كانت).
-- مسارات تعلم البرمجة (category = 'learning_path') معندهاش year_id أصلًا
-- (مش مرتبطة بجامعة/فرقة)، فبترجع false هنا لأي حد غير super_admin —
-- يعني إدارتها تفضل مقصورة على super_admin بس، بالتصميم.
create or replace function can_manage_course(target_course_id bigint)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select is_super_admin() or exists (
    select 1 from courses c
    where c.id = target_course_id
      and c.category = 'academic'
      and c.year_id is not null
      and is_year_manager(c.year_id)
  );
$$;

-- ============================================
-- courses: مادة أكاديمية جديدة/معدّلة/محذوفة لازم يكون year_id بتاعها
-- ضمن الفرق اللي أدمن الفرقة مسؤول عنها (أو المستخدم super_admin).
-- مسارات تعلم البرمجة (category = 'learning_path') تستثنى بالكامل —
-- year_id بيبقى null ليها أصلًا فمستحيل is_year_manager تنجح، فتفضل
-- super_admin بس اللي يقدر يديرها (بشرط is_admin() في is_super_admin()).
-- ============================================
drop policy if exists "Admins can insert courses" on courses;
create policy "Admins or year managers can insert courses" on courses
  for insert with check (
    is_super_admin()
    or (category = 'academic' and year_id is not null and is_year_manager(year_id))
  );

drop policy if exists "Admins can update courses" on courses;
create policy "Admins or year managers can update courses" on courses
  for update
  using (
    is_super_admin()
    or (category = 'academic' and year_id is not null and is_year_manager(year_id))
  )
  with check (
    is_super_admin()
    or (category = 'academic' and year_id is not null and is_year_manager(year_id))
  );

drop policy if exists "Admins can delete courses" on courses;
create policy "Admins or year managers can delete courses" on courses
  for delete using (
    is_super_admin()
    or (category = 'academic' and year_id is not null and is_year_manager(year_id))
  );

-- ============================================
-- books: مرتبطة بمادة عن طريق course_id، فبنستخدم can_manage_course() على
-- القيمة القديمة (using) والجديدة (with check) عشان أدمن فرقة ميقدرش
-- ينقل كتاب لمادة برة نطاقه.
-- ============================================
drop policy if exists "Admins can insert books" on books;
create policy "Admins or year managers can insert books" on books
  for insert with check (can_manage_course(course_id));

drop policy if exists "Admins can update books" on books;
create policy "Admins or year managers can update books" on books
  for update using (can_manage_course(course_id)) with check (can_manage_course(course_id));

drop policy if exists "Admins can delete books" on books;
create policy "Admins or year managers can delete books" on books
  for delete using (can_manage_course(course_id));

-- ============================================
-- playlists: نفس منطق books بالظبط.
-- ============================================
drop policy if exists "Admins can insert playlists" on playlists;
create policy "Admins or year managers can insert playlists" on playlists
  for insert with check (can_manage_course(course_id));

drop policy if exists "Admins can update playlists" on playlists;
create policy "Admins or year managers can update playlists" on playlists
  for update using (can_manage_course(course_id)) with check (can_manage_course(course_id));

drop policy if exists "Admins can delete playlists" on playlists;
create policy "Admins or year managers can delete playlists" on playlists
  for delete using (can_manage_course(course_id));

-- ============================================
-- book_folders: نفس منطق books بالظبط (فولدر مرتبط بمادة عن طريق course_id).
-- ============================================
drop policy if exists "Admins can insert book_folders" on book_folders;
create policy "Admins or year managers can insert book_folders" on book_folders
  for insert with check (can_manage_course(course_id));

drop policy if exists "Admins can update book_folders" on book_folders;
create policy "Admins or year managers can update book_folders" on book_folders
  for update using (can_manage_course(course_id)) with check (can_manage_course(course_id));

drop policy if exists "Admins can delete book_folders" on book_folders;
create policy "Admins or year managers can delete book_folders" on book_folders
  for delete using (can_manage_course(course_id));

-- ============================================
-- storage.objects (bucket 'books'): مسار كل ملف بيبدأ دايمًا بـ
-- "{course_id}/{folder_id}/..." (زي ما بيبنيه BookUploadForm في app/admin)،
-- فبنقرأ أول جزء من المسار كـ course_id ونتحقق منه بنفس can_manage_course().
-- ============================================
drop policy if exists "Admins can upload book files" on storage.objects;
create policy "Admins or year managers can upload book files" on storage.objects
  for insert with check (
    bucket_id = 'books'
    and can_manage_course((split_part(name, '/', 1))::bigint)
  );

drop policy if exists "Admins can update book files" on storage.objects;
create policy "Admins or year managers can update book files" on storage.objects
  for update using (
    bucket_id = 'books'
    and can_manage_course((split_part(name, '/', 1))::bigint)
  );

drop policy if exists "Admins can delete book files" on storage.objects;
create policy "Admins or year managers can delete book files" on storage.objects
  for delete using (
    bucket_id = 'books'
    and can_manage_course((split_part(name, '/', 1))::bigint)
  );

-- ============================================
-- الجداول التالية اتراجعت بالكامل وقررنا نسيبها super_admin بس عن قصد،
-- من غير أي تعديل في سياساتها (لسه شغالة بـ is_admin() اللي بقت alias
-- لـ is_super_admin() من roles_v2_setup.sql):
--
--   - universities: إنشاء/تعديل/حذف جامعة كاملة قرار مستوى أعلى من نطاق
--     أدمن فرقة واحدة (زي ما هو موضح في متطلبات النظام: "أنا (super_admin)
--     بيضيف جامعات").
--   - terms: مفيش أي واجهة في لوحة التحكم بتخلي أدمن الفرقة يعدّل/يضيف
--     ترمينات (بيتعملوا تلقائيًا مع كل فرقة جديدة)، فمفيش داعي نفتح
--     الكتابة عليها أصلًا.
--   - years: بنفس المنطق، الفرق الدراسية نفسها (إنشاء/إعادة تسمية/حذف)
--     مالهاش أي واجهة إدارة في التاب بتاع أدمن الفرقة — الفرق بتتعمل
--     تلقائيًا مع الجامعة عن طريق trigger (universities_setup.sql) بس.
--     ملحوظة: الجدول ده أصلًا معندوش أي سياسة كتابة (insert/update/delete)
--     حتى قبل التعديل ده — الكتابة الوحيدة عليه بتحصل عن طريق الـ trigger
--     اللي شغّال بصلاحية security definer وبيتخطى RLS تمامًا.
-- ============================================
