-- ============================================
-- عرض عام محدود لمواد حقيقية (لقسم "محتوى حقيقي" في الصفحة الرئيسية)
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل require_auth_content.sql و content_stats_setup.sql
-- و course_sections_setup.sql/course_order_setup.sql، لأنه بيعتمد على
-- courses/years/universities/playlists)
--
-- السياق: require_auth_content.sql قفل courses/years/universities/
-- playlists بالكامل خلف تسجيل الدخول (auth.uid() is not null) — وده
-- قرار صح ومقصود لمحتوى المواد الكامل. لكن الصفحة الرئيسية بيشوفها زوار
-- مش مسجلين دخول، والمطلوب نعرضلهم 3 كروت مواد حقيقية (اسم/تصنيف/عدد
-- فيديوهات) عشان يحسوا إن المنصة فيها محتوى فعلي قبل ما يسجّلوا.
--
-- الحل: view واحد بس بيكشف أعمدة محدودة جدًا (اسم المادة، تصنيفها، عدد
-- الفيديوهات، سياق الجامعة/الفرقة كنص جاهز) — مش الجدول نفسه. الـ view ده
-- من غير `security_invoker` (القيمة الافتراضية = false في Postgres 15+)
-- عشان يشتغل بصلاحيات مالكه (postgres/supabase_admin، بيتخطى RLS بشكل
-- طبيعي بحكم كونه superuser) مش بصلاحيات الزائر اللي بيستعلم منه — يعني
-- RLS الأصلية على courses/years/universities/playlists **باقية زي ما هي
-- بالظبط وما بتتأثرش**؛ الاستثناء الوحيد محصور في الأعمدة المكشوفة هنا
-- بس. **لو حد حاول "يصلّح" الـ view ده بإضافة security_invoker = true
-- مستقبلًا، هيرجع يقفل تاني على الزوار غير المسجلين — ده مش المطلوب.**
--
-- books/book_folders مقفولين زي ما هما بالظبط، مفيش أي كشف جزئي ليهم هنا.
-- ============================================

create or replace view public_course_previews as
select
  c.id,
  c.name,
  c.category,
  c.view_count,
  (select count(*) from playlists p where p.course_id = c.id) as video_count,
  case
    when c.category = 'learning_path' then 'مسار تعلم برمجة'
    else concat_ws(' — ', u.name, y.name)
  end as context_label
from courses c
left join years y on y.id = c.year_id
left join universities u on u.id = y.university_id;

grant select on public_course_previews to anon, authenticated;
