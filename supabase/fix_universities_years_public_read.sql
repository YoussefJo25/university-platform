-- ============================================
-- إصلاح: رجّع قراءة universities/years عامة (أسماء تنظيمية بس، مش محتوى
-- حساس) عشان فورم "إنشاء حساب" يقدر يجيب قايمة الجامعات/الفرق لزائر لسه
-- معندوش حساب. شغّل الملف ده يدويًا في SQL Editor بتاع Supabase (بعد
-- require_auth_content.sql، لأنه بيلغي جزء بسيط منه بس).
--
-- باقي الجداول (terms, courses, books, book_folders, playlists) سايبينها
-- على auth.uid() is not null زي ما هي — ده المحتوى الفعلي المطلوب حمايته.
-- الحماية على مستوى الصفحة (/universities, /academic-years) في proxy.ts
-- برضه زي ما هي، مش بتتغير هنا.
-- ============================================

drop policy if exists "Public can read universities" on universities;
create policy "Public can read universities" on universities
  for select using (true);

drop policy if exists "Public can read years" on years;
create policy "Public can read years" on years
  for select using (true);
