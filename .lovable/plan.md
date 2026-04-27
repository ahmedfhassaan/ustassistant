# تقرير مراجعة نظام RAG بعد التعديلات

راجعت كل ملف فعلياً + قاعدة البيانات + المحتوى الفعلي للأجزاء. النتائج بالتفصيل:

---

## ✅ ما يعمل بشكل صحيح

| الجانب | الحالة |
|---|---|
| قراءة `chunk_size`/`chunk_overlap` في `process-document` | ✅ تُقرأ فعلاً من `assistant_settings` (loadChunkSettings) مع حدود أمان (80–800 / 0–200) |
| قراءة إعدادات RAG في `chat` | ✅ `enable_query_rewriting`, `enable_reranking`, `initial_results_count`, `final_results_count`, `weight_*`, `confidence_threshold`, `strict_sources` كلها تُقرأ من DB |
| دالة `rewrite-query` | ✅ المفتاح يُقرأ من `Deno.env`، لا يُسرَّب للواجهة، timeout 1.5s، يرجع السؤال الأصلي عند أي فشل، يحتوي تعليمات "إذا خارج النطاق أعد السؤال كما هو" |
| Migration الخاصة بـ `search_knowledge_hybrid(weight_text, weight_semantic)` | ✅ مطبّقة وتعمل |
| `meta event` للمصادر في streaming | ✅ مُرسل قبل `[DONE]` و `chatApi.ts` يلتقطه عبر `parsed?.meta?.sources` بدون كسر عرض الرسالة |
| `onDone` يستقبل المصادر في حالة الكاش | ✅ `onDone({ sources: data.sources, cached: true })` |
| `[DONE]` لا يُرسل قبل المصادر | ✅ الترتيب صحيح: meta → ثم [DONE] |
| الكاش يُرجع المصادر القديمة | ✅ يُحفظ `sources` في `response_cache` ويُرجع مع الإجابة المخزنة |
| reranking لا يحذف نتيجة عالية فقط بسبب الموقع | ✅ الصيغة: `0.5 × normalizedRank + 0.35 × overlap + 0.15 × position` — الـ rank الأصلي يحمل أعلى وزن |
| reranking مع العربية | ✅ tokenizer يقبل المسافات وعلامات الترقيم العربية «»،؛ |
| `strict_sources` | ✅ عند تفعيله ولا توجد مصادر → يرجع `fallback_message` فوراً بدون استدعاء النموذج |

---

## ❌ مشاكل مكتشفة (حرجة + متوسطة)

### 🔴 مشكلة 1: حقول RAG الجديدة غير موجودة في قاعدة البيانات
استعلام `SELECT key FROM assistant_settings WHERE key IN (...)` أرجع **0 صفوف**.

النتيجة: حالياً النظام كله يعمل بـ **defaults** المضمّنة في `loadSettings` بـ `chat/index.ts` و `loadChunkSettings` بـ `process-document`.
- يعني: `enable_query_rewriting=false`, `enable_reranking=false`, `chunk_size=280`, `chunk_overlap=50`.
- صفحة المشرف تعرض القيم لكنها لم تُحفظ في DB بعد لأن المستخدم لم يضغط حفظ.
- ✅ هذا ليس عطلاً — التعديلات ستعمل **فور** ضغط "حفظ" في صفحة الإعدادات → /admin/settings → تبويب RAG.

### 🔴 مشكلة 2: التضارب الحقيقي — `confidence_threshold = 100`
في DB حالياً: `confidence_threshold = 100`، و `strict_sources = true`.

هذا يعني عملياً:
- أي سؤال درجة صلته أقل من 100% (وكلها كذلك تقريباً) → يُحقن في prompt تحذير `low_confidence_message`.
- مع `strict_sources=true` → النموذج مُلزم برفض الإجابة في معظم الحالات.
- النتيجة المتوقعة: **النموذج يردّ "لا تتوفر لدي هذه المعلومة" حتى للأسئلة الموجودة في قاعدة المعرفة**.

→ **يجب** إنزال `confidence_threshold` إلى `30–40` (هذا تعديل بيانات لا كود).

### 🔴 مشكلة 3: الأجزاء (chunks) القديمة مازالت كبيرة
- في DB: 13 مستنداً، 20 chunk فقط، متوسط الطول ~494 كلمة (≈ تقسيم 600 كلمة القديم).
- تعديلات `splitMarkdownAware` (280 كلمة) تنطبق **فقط على الملفات التي تُرفع بعد التعديل**.
- → **يجب إعادة معالجة المستندات الموجودة** لتصبح أجزاء أصغر وأدق (وإلا فائدة الـ chunking الجديد محدودة).

### 🟡 مشكلة 4: الكاش لا يُمسح تلقائياً عند تحديث قاعدة المعرفة
- لو رفع المشرف ملف جديد أو حذف ملفاً، الإجابات القديمة في `response_cache` تبقى صالحة 24 ساعة.
- لا يوجد ربط بين `response_cache` و `knowledge_documents`.
- الحل البسيط (موصى به): **حذف الكاش تلقائياً** عند رفع/حذف مستند معرفة.

### 🟡 مشكلة 5: `messages.length > 1` يعطّل الكاش بالكامل في المحادثات
سطر 211 في `chat/index.ts`: `if (messages.length > 1) return null;`
- معناه: الكاش يعمل فقط للسؤال الأول في المحادثة.
- هذا تصرف مقصود (لتجنب تأثير السياق) لكنه يقلل فعالية الكاش بشكل كبير.
- ليس خطأ تقنياً، فقط ملاحظة.

### 🟡 مشكلة 6: console.log لترتيب reranking غير محمي ببيئة التطوير
المطلوب: الطباعة في dev only. حالياً تُطبع في الإنتاج أيضاً.
- التأثير صغير (مجرد سطر سجل) لكن يستحق إصلاحاً.

### 🟡 مشكلة 7: `process-document` لا يحذف الأجزاء القديمة عند إعادة المعالجة
لو أعدنا معالجة مستند موجود → ستُضاف chunks جديدة بدون حذف القديمة → تكرار في النتائج.

---

## 🧪 الاختبارات الفعلية (لم أُجرِها لأن الوضع READ-ONLY)
يجب تشغيل هذه الاختبارات بعد تطبيق الإصلاحات:

| السؤال | المتوقع |
|---|---|
| "كم مدة الحرمان؟" | إجابة من القاعدة + مصدر |
| "متى يمنع الطالب من دخول الاختبار؟" (إعادة صياغة) | نفس الإجابة تقريباً + مصدر |
| "ما سعر الدولار اليوم؟" | رفض → `fallback_message` |
| "ما شروط التسجيل؟" | إجابة منظمة + مصدر |

---

# 🛠 خطة الإصلاح (بعد الموافقة)

## A) Migration واحدة: إدراج إعدادات RAG في DB + تعديل قيمة confidence_threshold
```sql
INSERT INTO assistant_settings (key, value) VALUES
  ('chunk_size', '280'),
  ('chunk_overlap', '50'),
  ('enable_query_rewriting', 'false'),
  ('enable_reranking', 'true'),
  ('initial_results_count', '10'),
  ('final_results_count', '5'),
  ('weight_text_default', '0.4'),
  ('weight_semantic_default', '0.6'),
  ('weight_text_exact', '0.65'),
  ('weight_text_semantic_lean', '0.3')
ON CONFLICT (key) DO NOTHING;

-- إصلاح القيمة الكارثية
UPDATE assistant_settings SET value = '35' WHERE key = 'confidence_threshold';
```

## B) إصلاحات كود

### 1. `process-document/index.ts`
- إضافة حذف `knowledge_chunks` القديمة قبل إدراج الجديدة (idempotent reprocess):
```ts
await supabase.from("knowledge_chunks").delete().eq("document_id", document_id);
```

### 2. `chat/index.ts`
- لفّ console.log الخاص بـ rerank بـ `Deno.env.get("DEBUG_RAG") === "true"`.
- إضافة طباعة `before/after rerank` تحت نفس الحارس.

### 3. ربط الكاش بقاعدة المعرفة (الحل البسيط)
في `process-document/index.ts` عند نجاح المعالجة، نضيف:
```ts
await supabase.from("response_cache").delete().neq("id", "00000000-0000-0000-0000-000000000000");
```
وعند حذف مستند من واجهة `KnowledgeManager` نفعل المثل.

### 4. زر يدوي في صفحة المشرف "إعادة معالجة كل المستندات"
يستدعي `process-document` لكل مستند `processed` → يعيد التقسيم بالـ 280 كلمة. (هذا الأهم بعد A).

---

## 📋 إجابات أسئلتك الصريحة

| سؤالك | الجواب |
|---|---|
| هل migration ناقصة؟ | نعم — INSERT لمفاتيح RAG في `assistant_settings` (موضحة في A) |
| هل أحتاج إعادة رفع ملفات المعرفة القديمة؟ | لا حاجة لإعادة رفع، فقط **إعادة معالجة** (سنضيف زراً لذلك) — أو يمكن للمشرف فعلياً حذف وإعادة الرفع |
| هل أحتاج لمسح الكاش؟ | نعم بعد تنفيذ الإصلاحات: `DELETE FROM response_cache;` (سيتم ضمن الإصلاحات) |
| ما الملفات التي تحتاج إصلاح؟ | `supabase/functions/process-document/index.ts`, `supabase/functions/chat/index.ts`, `src/pages/admin/KnowledgeManager.tsx` (إضافة زر إعادة المعالجة + حذف الكاش عند الحذف) |
| هل توجد ثغرات أمنية؟ | لا — `GOOGLE_AI_API_KEY` يبقى داخل Edge Function فقط، لا يُسرَّب |

---

## ⚙️ ملخص الإصلاحات التي سأنفذها

1. **Migration**: إدراج 10 مفاتيح RAG في `assistant_settings` + تخفيض `confidence_threshold` من 100 إلى 35.
2. **`process-document`**: حذف chunks قديمة قبل الإدراج + مسح الكاش عند انتهاء المعالجة.
3. **`chat`**: حماية logs بـ `DEBUG_RAG` env flag + طباعة ترتيب rerank قبل/بعد.
4. **`KnowledgeManager.tsx`**: زر "إعادة معالجة كل المستندات" + مسح الكاش عند حذف مستند.
5. **DELETE من `response_cache`** كأمر تشغيل لمرة واحدة بعد تطبيق الإصلاحات.

لا أضيف ميزات جديدة. فقط audit + fixes.
