

# إصلاح توليد Embeddings — Google AI Gemini API مباشرة

## المشكلة
بوابة Lovable AI Gateway ترفض نماذج Embeddings (خطأ 400). كل الـ 20 chunk بدون embeddings.

## الحل
استخدام Google AI Gemini API مباشرة مع نموذج `gemini-embedding-001` (768 بُعد — متوافق مع عمود DB الحالي، لا حاجة لـ migration).

## الخطوات

### 1. إضافة secret `GOOGLE_AI_API_KEY`
طلب المفتاح من المستخدم عبر أداة `add_secret`.

### 2. تعديل `supabase/functions/generate-embedding/index.ts`
- حذف استدعاء Lovable AI Gateway بالكامل
- استدعاء مباشر لـ:
  ```
  POST https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=API_KEY
  ```
- Body format:
  ```json
  {
    "requests": [
      { "model": "models/gemini-embedding-001", "content": { "parts": [{ "text": "..." }] } }
    ]
  }
  ```
- Timeout: 3 ثوانٍ عادي، 15 ثانية للـ backfill (عبر header `x-timeout`)
- عند الفشل: إرجاع `null` لكل نص بدون كسر الطلب
- Logs واضحة: نجاح/فشل، مدة التنفيذ، عدد النصوص، سبب الخطأ

### 3. لا تغييرات أخرى مطلوبة
- `chat/index.ts` يعمل بشكل صحيح (يستدعي `generate-embedding` ويمرر `null` عند الفشل)
- `search_knowledge_hybrid` SQL يدعم `query_embedding IS NULL` ويعود لـ full-text فقط
- `backfill-embeddings` يستدعي `generate-embedding` — سيعمل تلقائياً بعد الإصلاح
- أبعاد `gemini-embedding-001` = 768 = نفس عمود DB — لا migration

### 4. التحقق بعد التنفيذ
- استدعاء `generate-embedding` مباشرة للتأكد من توليد embedding
- استدعاء `backfill-embeddings` لتحديث الـ 20 chunk
- التحقق من عدد chunks التي أصبح لديها embedding

## الملفات المتأثرة
- `supabase/functions/generate-embedding/index.ts` — إعادة كتابة كاملة

## المتطلبات
- مفتاح `GOOGLE_AI_API_KEY` من [Google AI Studio](https://aistudio.google.com/apikey)

