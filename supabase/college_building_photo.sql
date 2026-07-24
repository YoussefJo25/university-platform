-- ============================================
-- صورة مبنى الكلية
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل site_settings_setup.sql)
-- ============================================

insert into site_settings (key, value) values
  ('college_building_photo_url', '')
on conflict (key) do nothing;
