-- ============================================
-- مسار تعلم البرمجة (يعيد استخدام جدول courses)
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- ============================================

-- تمييز نوع المادة: أكاديمية (مرتبطة بسنة/ترم) أو مسار تعلم برمجة مستقل
alter table courses add column if not exists category text not null default 'academic'
  check (category in ('academic', 'learning_path'));

-- خلي year_id اختياري (مطلوب للمواد الأكاديمية بس، مش لمسارات التعلم)
alter table courses alter column year_id drop not null;

-- تأكيد منطقي: مادة أكاديمية لازم يكون ليها سنة، مسار تعلم برمجة لأ
--
-- ملاحظة أمان: القيد ده آمن على البيانات الموجودة حاليًا بالضمان التالي —
-- عمود category بيتضاف بقيمة افتراضية 'academic' لكل الصفوف الموجودة،
-- و year_id كان already NOT NULL على كل الصفوف قبل السطر اللي فوق ده،
-- يعني كل مادة موجودة حاليًا هتبقى (category='academic' AND year_id IS NOT NULL)
-- تلقائيًا، فمفيش أي صف ممكن يخالف القيد ده وقت إضافته.
alter table courses drop constraint if exists courses_category_consistency;
alter table courses add constraint courses_category_consistency
  check (
    (category = 'academic' and year_id is not null)
    or (category = 'learning_path' and year_id is null)
  );
