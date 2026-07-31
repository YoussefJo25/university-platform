-- ============================================
-- تتبّع "هل الطالب شاف Modal جروب الواتساب قبل كده؟"
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل auth_setup.sql و profile_update_policy.sql)
--
-- مفيش policy جديدة مطلوبة هنا: "Users can update their own profile"
-- الموجودة بالفعل في profile_update_policy.sql بتسمح للمستخدم يعدّل أي
-- عمود في صف بروفايله هو بس (auth.uid() = id)، وده يغطي العمود الجديد ده
-- تلقائيًا من غير أي تعديل إضافي على RLS.
-- ============================================

alter table public.profiles
  add column if not exists has_seen_whatsapp_modal boolean not null default false;
