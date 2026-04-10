

# ترقية نظام البحث إلى بحث دلالي حقيقي (Semantic Search with Embeddings)

## الوضع الحالي
النظام يستخدم بحث نصي بالكلمات المفتاحية فقط (Full-Text Search + Regex). لا يفهم المعنى — مثلاً البحث عن "كيف أسجل مواد" لن يجد نصاً يحتوي "إضافة مقررات".

## الحل المقترح: بحث هجين (Hybrid Search)
الجمع بين البحث النصي الحالي + بحث دلالي بالـ embeddings للحصول على أفضل النتائج. لن نحذف البحث القديم بل نضيف عليه.

---

## التعديلات المطلوبة

### 1. قاعدة البيانات (Migration)
- تفعيل إضافة `pgvector`
- إضافة عمود `embedding vector(768)` لجدول `knowledge_chunks`
- إنشاء فهرس IVFFlat للبحث السريع
- إنشاء دالة `search_knowledge_semantic` تجمع بين البحث النصي والدلالي مع ترتيب هجين

```sql
-- تفعيل pgvector
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- إضافة عمود الـ embedding
ALTER TABLE knowledge_chunks ADD COLUMN embedding vector(768);

-- فهرس للبحث السريع
CREATE INDEX ON knowledge_chunks 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- دالة بحث هجين
CREATE FUNCTION search_knowledge_hybrid(
  query_text text, query_embedding vector(768), max_results int
) ...
```

### 2. Edge Function جديدة: `generate-embedding`
- دالة تولّد embeddings باستخدام Lovable AI Gateway (endpoint: `/v1/embeddings`)
- إذا لم يدعم الـ gateway الـ embeddings، سنستخدم نموذج Gemini عبر chat completions كبديل
- تُستدعى من `process-document` ومن `chat`

### 3. تعديل `process-document/index.ts`
- بعد تقسيم النص إلى chunks، استدعاء `generate-embedding` لكل chunk
- حفظ الـ embedding مع كل chunk في قاعدة البيانات

### 4. تعديل `chat/index.ts`
- توليد embedding لسؤال المستخدم
- استدعاء دالة البحث الهجين بدلاً من `search_knowledge`
- النتائج ستكون أدق لأنها تجمع بين تطابق الكلمات وتشابه المعنى

### 5. إعادة معالجة المستندات الحالية
- إضافة زر في لوحة المشرف "إعادة توليد Embeddings" لمعالجة المستندات الموجودة

---

## التفاصيل التقنية

**نموذج الـ Embeddings**: سيتم استخدام الـ gateway endpoint `/v1/embeddings` مع نموذج متوافق. حجم الـ vector: 768 بُعد.

**صيغة البحث الهجين**:
```
final_score = 0.4 × keyword_rank + 0.6 × cosine_similarity
```
يعطي وزناً أكبر للتشابه الدلالي مع الاحتفاظ بدقة الكلمات المفتاحية.

**الملفات المتأثرة**:
- `supabase/functions/generate-embedding/index.ts` (جديد)
- `supabase/functions/process-document/index.ts` (تعديل)
- `supabase/functions/chat/index.ts` (تعديل)
- `src/pages/AdminKnowledge.tsx` (إضافة زر إعادة المعالجة)
- Migration جديد لقاعدة البيانات

