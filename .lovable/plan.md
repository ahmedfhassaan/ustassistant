

# إصلاح وتفعيل البحث الدلالي باستخدام OpenAI Embeddings

## ملخص التغييرات

### 1. إضافة مفتاح `OPENAI_API_KEY`
طلب المفتاح من المستخدم عبر أداة `add_secret`.

### 2. إعادة كتابة `supabase/functions/generate-embedding/index.ts`
- حذف كامل للكود القديم (chat completions, tool calling, fallback)
- استدعاء مباشر لـ `POST https://api.openai.com/v1/embeddings` مع `text-embedding-3-small` و `dimensions: 768`
- `AbortController` مع timeout = 3 ثوانٍ
- إرجاع `number[][]` أو فشل مع `null` per-text
- Logs: مدة التنفيذ، طول النص، نجاح/فشل

### 3. تعديل `supabase/functions/chat/index.ts`
- تشغيل `loadSettings` + rate limit + cache check بالتوازي عبر `Promise.all`
- حذف fallback إلى `search_knowledge` نهائياً
- استخدام `search_knowledge_hybrid` دائماً
- إذا فشل embedding → تمرير `null` كـ `query_embedding`
- لا يتوقف الرد أبداً بسبب فشل embedding

### 4. تعديل SQL: `search_knowledge_hybrid`
- تعديل الدالة لقبول `query_embedding` كـ nullable
- إذا `NULL` → الترتيب 100% على Full-text (تجاهل الجزء الدلالي)
- إذا موجود → hybrid ranking بالأوزان الحالية (0.4 نصي + 0.6 دلالي)

### 5. إنشاء `supabase/functions/backfill-embeddings/index.ts`
- دالة جديدة تقرأ جميع chunks بدون embedding أو بـ embedding قديم
- تولّد embeddings جديدة باستخدام `text-embedding-3-small` + `dimensions: 768`
- تعالج على دفعات (batch) مع مهلة أعلى من 3 ثوانٍ
- Logs: عدد الناجح والفاشل

### 6. تصفير Embeddings القديمة
- Migration لتصفير جميع embeddings الحالية (`UPDATE knowledge_chunks SET embedding = NULL`)
- لضمان عدم خلط embeddings قديمة (chat completions) مع OpenAI الجديدة

### 7. تعديل `src/pages/AdminKnowledge.tsx`
- إضافة زر "إعادة توليد Embeddings" يستدعي `backfill-embeddings`
- يعرض حالة التشغيل وعدد chunks المحدّثة وأي أخطاء

## الملفات المتأثرة
- `supabase/functions/generate-embedding/index.ts` — إعادة كتابة كاملة
- `supabase/functions/chat/index.ts` — تحسين + حذف fallback
- `supabase/functions/backfill-embeddings/index.ts` — ملف جديد
- `src/pages/AdminKnowledge.tsx` — زر backfill
- Migration SQL — تعديل `search_knowledge_hybrid` + تصفير embeddings

## متطلبات
- مفتاح `OPENAI_API_KEY` (سيُطلب من المستخدم)

