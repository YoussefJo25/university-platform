-- ============================================
-- إعدادات الموقع (Site Settings)
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل auth_setup.sql، لأنه بيعتمد على دالة is_admin())
-- ============================================

-- 1) جدول الإعدادات: key/value بسيط
create table if not exists site_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

alter table site_settings enable row level security;

create policy "Public can read site_settings" on site_settings
  for select using (true);

create policy "Admins can update site_settings" on site_settings
  for all using (is_admin()) with check (is_admin());

-- تعبئة القيم الافتراضية الحالية (نفس النصوص الموجودة في الكود دلوقتي بالظبط،
-- عشان الموقع ميتغيرش شكله فورًا)
insert into site_settings (key, value) values
  ('university_name', 'جامعة المنيا الاهلية'),
  ('logo_url', null),
  ('hero_title', 'مرحبًا بكم في جامعة المنيا الاهلية'),
  ('hero_subtitle', 'منصتكم الإلكترونية الموحدة للمحاضرات والجداول والخدمات الأكاديمية'),
  ('support_email', 'support@minia-national.edu.eg'),
  ('support_phone', ''),
  ('social_facebook', ''),
  ('social_twitter', ''),
  ('social_instagram', ''),
  ('footer_text', 'جميع الحقوق محفوظة لجامعة المنيا الاهلية')
on conflict (key) do nothing;

-- 2) bucket عام لرفع أصول الموقع (اللوجو حاليًا)
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do nothing;

create policy "Public can read site assets" on storage.objects
  for select using (bucket_id = 'site-assets');

create policy "Admins can upload site assets" on storage.objects
  for insert with check (bucket_id = 'site-assets' and is_admin());

create policy "Admins can update site assets" on storage.objects
  for update using (bucket_id = 'site-assets' and is_admin());

create policy "Admins can delete site assets" on storage.objects
  for delete using (bucket_id = 'site-assets' and is_admin());
