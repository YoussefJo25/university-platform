-- ============================================
-- بيانات تجريبية: 3 مواد لكل سنة دراسية (تخصص علوم حاسب)
-- ============================================

insert into courses (year_id, name, description) values
  -- الفرقة الأولى
  ((select id from years where year_number = 1), 'أساسيات البرمجة', 'مقدمة في مفاهيم البرمجة وحل المشكلات'),
  ((select id from years where year_number = 1), 'الرياضيات (1)', 'التفاضل والتكامل الأساسي'),
  ((select id from years where year_number = 1), 'مبادئ نظم المعلومات', 'مقدمة في نظم المعلومات ومكوناتها'),

  -- الفرقة الثانية
  ((select id from years where year_number = 2), 'هياكل البيانات', 'تمثيل ومعالجة البيانات بكفاءة'),
  ((select id from years where year_number = 2), 'قواعد البيانات', 'تصميم وإدارة قواعد البيانات العلائقية'),
  ((select id from years where year_number = 2), 'الاحتمالات والإحصاء', 'أساسيات التحليل الإحصائي والاحتمالات'),

  -- الفرقة الثالثة
  ((select id from years where year_number = 3), 'هندسة البرمجيات', 'مراحل ومنهجيات تطوير البرمجيات'),
  ((select id from years where year_number = 3), 'الذكاء الاصطناعي', 'مقدمة في خوارزميات وتطبيقات الذكاء الاصطناعي'),
  ((select id from years where year_number = 3), 'شبكات الحاسب', 'أساسيات الشبكات وبروتوكولات الاتصال'),

  -- الفرقة الرابعة
  ((select id from years where year_number = 4), 'أمن المعلومات', 'مبادئ حماية البيانات والأنظمة'),
  ((select id from years where year_number = 4), 'تعلم الآلة', 'خوارزميات التعلم الآلي وتطبيقاتها'),
  ((select id from years where year_number = 4), 'مشروع التخرج', 'مشروع تطبيقي شامل يجمع مهارات الطالب');
