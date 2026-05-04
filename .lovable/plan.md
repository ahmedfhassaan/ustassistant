## الهدف
إزالة قسم "الزحف المخزّن" من واجهة الإدارة بالكامل، والإبقاء فقط على إعدادات **البحث المباشر (Live Search)** مع حقل رابط الموقع الذي يحدّد نطاق البحث.

## التغييرات

### 1. `src/components/admin/WebSourceCard.tsx`
- حذف كامل قسم "تفعيل الزحف المخزّن" بما فيه:
  - زر التبديل `web_crawl_enabled`
  - عرض آخر تحديث وآخر حالة (`web_crawl_last_run_at` / `web_crawl_last_status`)
  - زر "تحديث الآن" والدالة `handleRunNow` المرتبطة باستدعاء `crawl-website`
  - الأيقونات `RefreshCw / CheckCircle2 / AlertCircle` غير المستخدمة
  - الحالات: `enabled, lastRunAt, lastStatus, running, crawlDisabled`
- تبسيط `KEYS` لإبقاء فقط:
  ```
  web_crawl_root_url
  live_search_enabled
  live_search_max_results
  live_search_timeout_ms
  ```
- إزالة شرط التعطيل البصري للقسم القديم وإزالة جملة "الزحف الليلي يتوقف تلقائياً" من نص التوضيح، لتصبح:  
  «عند التفعيل، يبحث المساعد لحظياً في موقع الجامعة لكل سؤال. المستندات المرفوعة تبقى مصدراً مكمّلاً.»
- في `handleSave` لا نحفظ `web_crawl_enabled` بعد الآن.
- إعادة تسمية عنوان البطاقة (اختياري) إلى: «مصدر الويب — البحث المباشر».

### 2. الإبقاء كما هو (لا تغيير)
- `supabase/functions/chat/index.ts`: المنطق يقرأ `live_search_enabled` فقط؛ يبقى `web_crawl_root_url` كنطاق للبحث.
- `supabase/functions/crawl-website/index.ts`: لا يُستدعى من الواجهة بعد الآن. يبقى موجوداً كملف خامل بدون أي زر يشغّله (يمكن حذفه لاحقاً عند الحاجة).
- لا تغيير على قاعدة البيانات. مفاتيح `web_crawl_enabled` / `web_crawl_last_*` تبقى في الجدول دون استخدام، ولن تظهر في الواجهة.

## ملخّص ملف واحد فقط يُعدَّل
- `src/components/admin/WebSourceCard.tsx`

النتيجة: بطاقة نظيفة تعرض فقط حقل رابط الموقع، مفتاح "وضع البحث المباشر"، وحقلَي عدد النتائج وزمن الانتظار، مع زر "حفظ الإعدادات".
