-- ============================================
-- قصر عرض المحتوى الأكاديمي على المستخدمين المسجلين دخول فقط
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل universities_setup.sql, terms_setup.sql, schema.sql,
-- و book_folders_setup.sql، لأنه بيعدّل سياسات select الموجودة عليهم بالفعل)
--
-- site_settings و leadership_members سايبينهم زي ما هم (عامين للجميع)،
-- عشان الصفحة الرئيسية والدعم الفني لسه لازم يشتغلوا لزائر مش مسجل دخول.
-- ============================================

alter policy "Public can read universities" on universities
  using (auth.uid() is not null);

alter policy "Public can read years" on years
  using (auth.uid() is not null);

alter policy "Public can read terms" on terms
  using (auth.uid() is not null);

alter policy "Public can read courses" on courses
  using (auth.uid() is not null);

alter policy "Public can read books" on books
  using (auth.uid() is not null);

alter policy "Public can read book_folders" on book_folders
  using (auth.uid() is not null);

alter policy "Public can read playlists" on playlists
  using (auth.uid() is not null);
