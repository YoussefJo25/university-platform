-- ============================================
-- تبسيط قسم القيادة: مطوّر المنصة + إهداء (صدقة جارية)
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل leadership_setup.sql، لأنه بيعدّل جدول leadership_members
-- الموجود بالفعل)
-- ============================================

-- 1) حذف صفوف رئيس الجامعة والعميد أولًا — لازم يحصل قبل تضييق الـ check
-- constraint تحت، وإلا الـ constraint هيرفض لأن الصفوف دي لسه موجودة
-- بقيم مش هتبقى مسموحة.
delete from leadership_members where role_key in ('university_president', 'college_dean');

-- 2) تضييق نطاق الأدوار المسموحة لتشمل بس مطوّر المنصة والإهداء
alter table leadership_members drop constraint if exists leadership_members_role_key_check;
alter table leadership_members add constraint leadership_members_role_key_check
  check (role_key in ('developer', 'dedication'));

-- 3) إضافة صف الإهداء
insert into leadership_members (role_key, name, title, bio, order_index) values
  ('dedication', 'الحاج مبروك أبو كامل', 'صدقة جارية', 'هذا العمل صدقة جارية على روح عمي الحاج مبروك أبو كامل، رحمه الله رحمة واسعة وأسكنه فسيح جناته. من دخل هذه المنصة وانتفع بها، فلا يبخل عليه بدعوة صادقة.', 1)
on conflict (role_key) do nothing;
