-- ============================================
-- تتبّع إرسال رابط جروب الواتساب يدويًا لكل مستخدم (لوحة تحكم الأدمن)
-- شغّل الملف ده يدويًا في SQL Editor بتاع Supabase
-- (بعد تشغيل roles_v2_setup.sql و daily_activity_setup.sql، لاستخدام is_staff())
--
-- مشكلة أمان لازم نتفاداها: سياسة "Users can update their own profile"
-- الموجودة بالفعل (profile_update_policy.sql) بتسمح للمستخدم يعدّل أي
-- عمود في صف بروفايله هو بس — بما فيها العمود الجديد ده. RLS بتتحكم في
-- "أي صف؟" مش "أي عمود؟"، فمجرد ما نضيف العمود، أي طالب هيقدر يبعت
-- update مباشر لصفه هو ويحط whatsapp_link_sent = true بنفسه، حتى لو
-- محدش بعتله حاجة فعليًا.
--
-- الحل: نمنع صلاحية تعديل العمود ده تحديدًا على مستوى الجدول (column-level
-- privilege، مستقل عن RLS) من أي مستخدم مسجل دخول عادي، والكتابة الوحيدة
-- المسموحة عن طريق دالة (security definer) بتتحقق من is_staff() قبل
-- التعديل. نفس فلسفة video_answers.is_staff_answer وbroadcast_notification
-- قبل كده في المشروع ده.
-- ============================================

alter table public.profiles
  add column if not exists whatsapp_link_sent boolean not null default false;

revoke update (whatsapp_link_sent) on public.profiles from authenticated;

create or replace function public.set_whatsapp_link_sent(target_profile_id uuid, sent boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_staff() then
    raise exception 'غير مسموح لك بتحديث حالة إرسال رابط الواتساب';
  end if;

  update public.profiles set whatsapp_link_sent = sent where id = target_profile_id;
end;
$$;

grant execute on function public.set_whatsapp_link_sent(uuid, boolean) to authenticated;
