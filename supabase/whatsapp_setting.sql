-- ============================================
-- رقم الواتساب (زرار عائم ثابت)
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل site_settings_setup.sql)
-- ============================================

insert into site_settings (key, value) values
  ('whatsapp_number', '')
on conflict (key) do nothing;
