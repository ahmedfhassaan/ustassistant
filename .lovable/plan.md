## الهدف
حذف تكامل Firecrawl بالكامل، والاعتماد فقط على **Google Grounding Search** (المُفعَّل أصلًا داخل `chat/index.ts` كوضع `live_search_enabled`).

## التغييرات

### 1. حذف ملفات/مكونات
- **حذف** Edge Function: `supabase/functions/crawl-website/` بالكامل.
- **حذف** المكوّن: `src/components/admin/WebSourceCard.tsx` (أو إعادة بنائه؟ — انظر أدناه).
- **حذف** سر `FIRECRAWL_API_KEY` من إعدادات المشروع.

### 2. تعديل `src/pages/AdminKnowledge.tsx`
- إزالة `import WebSourceCard` والاستخدام في السطر 501.
- استبداله بـ **بطاقة جديدة** (`LiveSearchCard`) مبسّطة فيها فقط:
  - مفتاح تشغيل/إيقاف **«البحث المباشر في موقع الجامعة (Google)»** → يحفظ `live_search_enabled`.
  - حقل **«النطاق المستهدف»** (افتراضيًا `www.ust.edu`) → يحفظ `web_crawl_root_url` (نُعيد استخدام نفس المفتاح كـ "domain" لتقييد البحث).
  - مهلة الاستجابة (ms) → `live_search_timeout_ms`.
  - عدد المصادر الأقصى → `live_search_max_results`.
- إزالة كل أزرار «تشغيل الزحف الآن» وعرض حالة الزحف.

### 3. تعديل `supabase/functions/chat/index.ts`
- **تغيير الافتراضي** للسطر 169: `live_search_enabled: "true"` (بدلاً من `"false"`).
- لا تغيير على منطق Grounding نفسه — يعمل بالفعل بشكل صحيح (الأسطر 655-705).

### 4. تعديل `src/pages/Documentation.tsx`
- حذف الأسطر التي تذكر `crawl-website` ومصادر الويب المُزحوفة (350، 370، 540).
- إضافة فقرة قصيرة تشرح **Google Grounding** كمصدر مباشر للمعلومات اللحظية.

### 5. قاعدة البيانات
- لا تغيير على المخطط. مفاتيح `assistant_settings` التالية تبقى كما هي وتُستخدم:
  - `live_search_enabled`, `live_search_max_results`, `live_search_timeout_ms`, `web_crawl_root_url` (يُعاد استخدامه كـ domain filter).
- **اختياري:** حذف صفوف `assistant_settings` ذات المفاتيح: `web_crawl_enabled`, `web_crawl_last_run_at`, `web_crawl_last_status` (لم تعد مستخدمة).
- **اختياري:** الإبقاء على `knowledge_documents` ذات `source_type = 'web'` السابقة (لن تُحدَّث بعد الآن، لكنها تظل في الـ RAG حتى يحذفها المشرف يدويًا من واجهة المعرفة).

## ما لن يتغيّر
- منطق Google Grounding في `chat/index.ts` (موجود وجاهز).
- باقي تدفّق RAG (FTS + pgvector + caching).
- صفحة `/contact` وبقية الواجهات.

## ملاحظة سياسية (Google ToS)
Google تشترط عرض **Search Suggestions** (`searchEntryPoint.renderedContent`) عند استخدام Grounding في إنتاج. الكود الحالي لا يعرضها — إن أردت الالتزام الكامل، أضف عرضها أسفل الإجابة. أخبرني إن أردت إضافة ذلك ضمن نفس التغيير.
