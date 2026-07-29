-- ============================================
-- محتوى الصفحة الرئيسية القابل للتعديل من الداشبورد (ثيم "بوصلة" المنقّح)
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل site_settings_setup.sql، لأن site_settings أصلًا جدول
-- key/value عام مش محتاج أي عمود جديد — الملف ده بس بيضيف صفوف مفاتيح
-- جديدة، بنفس أسلوب whatsapp_setting.sql/social_linkedin.sql)
--
-- نص قسم الإهداء المنفصل (DedicationSection) اتعمّد إنه مش هنا — بياخد
-- بياناته من leadership_members (role_key = 'dedication') الموجود
-- بالفعل وقابل للتعديل من تاب "القيادة"، عشان مايبقاش فيه مصدرين
-- منفصلين لنفس النص.
-- ============================================

insert into site_settings (key, value) values
  ('hero_title_line1', 'ابحث عن'),
  ('hero_title_highlight', 'طريقك'),
  ('hero_title_line2', 'وسط زحمة المذاكرة'),
  ('hero_dedication_text', 'كل مادة، كل فيديو، كل صفحة هنا اتحطت بحب، إهداءً لروح غالية علينا'),
  ('journey_station_1_title', 'الفرقة الأولى'),
  ('journey_station_1_sub', 'أول خطوة في رحلتك'),
  ('journey_station_2_title', 'الفرقة الثانية'),
  ('journey_station_2_sub', 'تعمّق أكتر في التخصص'),
  ('journey_station_3_title', 'الفرقة الثالثة'),
  ('journey_station_3_sub', 'مهارات عملية وتطبيقية'),
  ('journey_station_4_title', 'الفرقة الرابعة'),
  ('journey_station_4_sub', 'استعداد لسوق العمل')
on conflict (key) do nothing;
