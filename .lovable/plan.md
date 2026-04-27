
# خطة تحسين نظام RAG

تحسينات على 7 محاور دون تغيير واجهة الدردشة أو كسر أي وظيفة. كل خطوة جديدة لها timeout قصير و fallback للنظام الحالي.

---

## 1. تحسين تقسيم Markdown (`process-document`)

استبدال `splitIntoChunks` بدالة جديدة `splitMarkdownAware`:

- **الحجم الافتراضي:** 280 كلمة، **overlap:** 50 كلمة (قابل للتعديل من إعدادات المشرف).
- **وعي بالعناوين:** تقطيع أولي على عناوين Markdown (`#`, `##`, `###`) ثم على الفقرات.
- **حفظ السياق:** يُمرَّر العنوان الأقرب (Heading prefix) في بداية كل chunk تابع له، حتى لو كان الجزء طويلاً وانقسم — ليبقى السياق واضحاً للبحث الدلالي.
- **حماية الجداول والقوائم:**
  - كشف بلوكات الجداول (الأسطر التي تبدأ وتنتهي بـ `|`) والقوائم المتتالية (`-`, `*`, `1.`).
  - عدم قطعها في المنتصف؛ إذا تجاوزت الحد، تُحفظ ككتلة واحدة (chunk منفصل) حتى لو تجاوز قليلاً الحد المسموح.
- **حد أدنى للجزء:** 60 كلمة لتجنّب أجزاء تافهة.

> سيتم قراءة `chunk_size` و `chunk_overlap` من `assistant_settings` مع defaults آمنة، وإن لم توجد يستخدم 280/50.

---

## 2. البحث الهجين بأوزان ديناميكية (`search_knowledge_hybrid`)

تعديل دالة PostgreSQL لقبول معاملين جديدين:

```sql
search_knowledge_hybrid(
  query_text text,
  query_embedding text DEFAULT NULL,
  max_results int DEFAULT 5,
  weight_text float DEFAULT 0.4,
  weight_semantic float DEFAULT 0.6
)
```

في `chat/index.ts` نضيف **مُصنِّف نوع السؤال (Query Classifier)** خفيف:

- **Exact-match heuristic** — يرفع `weight_text` إذا احتوى السؤال على:
  - أرقام (مواد مثل `CS101`, ساعات معتمدة، نسب).
  - علامات اقتباس `"..."` أو `«...»`.
  - مصطلحات لوائح محددة (انسحاب، اعتذار، إنذار، GPA، تراكمي…).
  - **النتيجة:** `0.65 / 0.35` (نص/دلالي).
- **Semantic-leaning** — أسئلة عامة طويلة بدون أرقام أو رموز:
  - **النتيجة:** `0.3 / 0.7`.
- **Default** — `0.4 / 0.6` (السلوك الحالي).

القيم الأساسية الثلاث (text, semantic, default) قابلة للتعديل من إعدادات المشرف.

---

## 3. Query Rewriting اختياري

دالة حافة جديدة **`rewrite-query`** صغيرة:

- تستقبل السؤال الأصلي.
- تستدعي **Gemini 2.5 Flash-Lite** (سريع وأرخص) عبر Google API بـ **timeout = 1500ms**.
- system prompt مُقيَّد: *"أعد صياغة هذا السؤال الجامعي ككلمات مفتاحية بحثية باللغة العربية، 5-10 كلمات فقط، بدون شرح، حافظ على السياق الجامعي."*
- ترجع نصاً واحداً (keywords).

في `chat/index.ts`:
- يُنفَّذ **بالتوازي مع توليد embedding للسؤال الأصلي** (لا يضيف latency).
- يُستخدم النص المُعاد صياغته لـ `query_text` فقط في `search_knowledge_hybrid`.
- **embedding يبقى للسؤال الأصلي** (لأن التشابه الدلالي يعمل أفضل مع السؤال الطبيعي).
- **Fallback:** عند الفشل أو timeout → استخدم السؤال الأصلي.
- مُعطَّل افتراضياً (`enable_query_rewriting=false`) — يفعّله المشرف.

---

## 4. Reranking اختياري

في `chat/index.ts` بعد `search_knowledge_hybrid`:

- جلب **`initial_results_count`** نتائج (افتراضي 10) بدلاً من 5.
- **استراتيجية rerank بدون استدعاء AI إضافي** (لتجنّب أي latency):
  - **Cross-score:** إعادة حساب درجة لكل chunk = `0.5 × hybrid_rank + 0.3 × keyword_overlap + 0.2 × position_boost`.
    - `keyword_overlap`: نسبة كلمات السؤال (أو السؤال المُعاد صياغته) الموجودة حرفياً في chunk.
    - `position_boost`: مكافأة بسيطة لـ chunks تحتوي العنوان الأقرب لأحد كلمات السؤال.
  - الترتيب التنازلي → اختيار أفضل **`final_results_count`** (افتراضي 5).
- **Fallback:** إذا فشل rerank لأي سبب → استخدم النتائج الأولى من hybrid كما هي.
- مُعطَّل افتراضياً (`enable_reranking=false`).

> ملاحظة: يمكن لاحقاً إضافة rerank بنموذج AI، لكن نبدأ بالخوارزمية الخفيفة لضمان السرعة.

---

## 5. تقوية منع الهلوسة (System Prompt)

تعديل `systemPrompt` في `chat/index.ts`:

- إضافة قواعد صارمة في الأعلى (قبل أي تنسيق):
  ```
  ⛔ قواعد إجبارية:
  1. أجب فقط من "معلومات قاعدة المعرفة" المرفقة أدناه.
  2. ممنوع منعاً باتاً الاستنتاج، التخمين، أو إضافة معلومات من معرفتك العامة.
  3. إذا لم تجد إجابة واضحة في السياق، أجب حرفياً:
     "لا تتوفر لدي هذه المعلومة في قاعدة المعرفة الحالية."
  4. لا تذكر أنك ذكاء اصطناعي ولا تعتذر عن قيودك.
  ```
- يطبَّق دائماً عند `strict_sources=true` (ويصبح `true` افتراضياً للمستخدمين الجدد).
- عند `strict_sources=false` تبقى القواعد الحالية للمرونة.

---

## 6. عرض المصادر — تحسين الموثوقية

الكود الحالي يعرض المصادر فعلاً (`message.source` في `ChatMessage.tsx`)، لكن نضمن:

- **في الكاش:** الـ `cachePromise` يُرجع `sources` ويتم تمريره للواجهة (موجود — نتأكد فقط).
- **في الرد العادي:** بدلاً من الاعتماد على النموذج لإلحاق `[المصادر: ...]` في النص (غير موثوق)، نُعيد `sources` كحقل مستقل في **آخر SSE chunk** (مع الحفاظ على التوافق):
  - بعد إرسال `[DONE]`، نُرسل event مخصصاً `data: {"meta": {"sources": "..."}}` ثم `[DONE]` نهائي.
  - في `chatApi.ts` نلتقطه ونمرّره لـ `onDone({sources, cached})` — **هذه الواجهة موجودة بالفعل**.
- **إزالة** التعليمة `showSourcesInstruction` من system prompt لأنها أصبحت غير ضرورية (المصادر تُلحق برمجياً).

النتيجة: المصادر تظهر دائماً تحت كل إجابة (كاش أو لا) عبر نفس مكوّن `ChatMessage` الحالي — صفر تغيير في الواجهة.

---

## 7. تحديث صفحة إعدادات المشرف

إضافة تبويب جديد **"RAG"** في `AdminSettings.tsx` (بجانب التبويبات الخمسة الموجودة) يحوي:

| الإعداد | النوع | الافتراضي |
|---|---|---|
| `chunk_size` | Number (100-600) | 280 |
| `chunk_overlap` | Number (0-150) | 50 |
| `enable_query_rewriting` | Switch | false |
| `enable_reranking` | Switch | false |
| `initial_results_count` | Number (5-30) | 10 |
| `final_results_count` | Number (1-15) | 5 |
| `weight_text_default` | Slider 0-1 | 0.4 |
| `weight_semantic_default` | Slider 0-1 | 0.6 |
| `weight_text_exact` | Slider 0-1 | 0.65 |
| `weight_text_semantic_lean` | Slider 0-1 | 0.3 |
| `confidence_threshold` | Slider | (موجود — ينتقل لهنا) |

كل القيم تُحفظ في `assistant_settings` (key/value) — لا migration للجدول. الحقول تُضاف لـ `AssistantSettings` interface و `DEFAULTS` في `use-settings.ts`.

> ملاحظة: تغيير `chunk_size` أو `chunk_overlap` لن يُعيد معالجة المستندات الموجودة — يحتاج المشرف لإعادة رفعها. سنضيف ملاحظة توضيحية تحت الحقلين.

---

## ملفات سيتم تعديلها

### Edge Functions
- **`supabase/functions/process-document/index.ts`** — استبدال دالة التقطيع بـ markdown-aware، قراءة `chunk_size`/`chunk_overlap` من الإعدادات.
- **`supabase/functions/chat/index.ts`** — إضافة:
  - مُصنِّف نوع السؤال + اختيار أوزان ديناميكية.
  - استدعاء اختياري لـ `rewrite-query` (parallel مع embedding).
  - reranking خفيف اختياري بعد hybrid search.
  - تقوية system prompt بقواعد منع الهلوسة.
  - إلحاق `sources` كـ meta-event في SSE.
- **`supabase/functions/rewrite-query/index.ts`** — جديد، صغير (~60 سطر).

### Database (migration واحد)
- تعديل `search_knowledge_hybrid` لقبول `weight_text` و `weight_semantic` كمعاملين.

### Frontend
- **`src/lib/chatApi.ts`** — التقاط meta-event للـ sources وتمريره في `onDone`.
- **`src/hooks/use-settings.ts`** — إضافة الحقول الجديدة لـ interface و DEFAULTS.
- **`src/pages/AdminSettings.tsx`** — تبويب جديد "RAG" مع كل الحقول.
- **`src/pages/Chat.tsx`** *(فحص فقط)* — التأكد من تمرير `sources` من `onDone` إلى `message.source` (إذا لم يكن موجوداً، إضافة سطر واحد).

### بدون تغيير
- `ChatMessage.tsx`, `ChatInput.tsx`, `ChatSidebar.tsx`, `ChatWelcome.tsx` — الواجهة كما هي.
- `generate-embedding/index.ts` — يعمل كما هو.

---

## ضمانات الأداء

- كل خطوة جديدة لها **timeout صريح**: rewrite-query (1.5s)، embedding (3s الحالي).
- rewrite-query يعمل **بالتوازي** مع embedding → لا latency إضافي.
- reranking خوارزمي محلي (بدون شبكة) → < 50ms.
- كل خطوة فاشلة تسقط بصمت إلى السلوك الحالي.
- زمن الرد المستهدف: **2-4 ثوانٍ** (مماثل للحالي أو أفضل بفضل chunks أصغر = سياق أدق = توليد أسرع).

---

## الترتيب التنفيذي (عند الموافقة)

1. Migration: تعديل `search_knowledge_hybrid` بإضافة معاملي الأوزان.
2. تحديث `process-document` بدالة التقطيع الجديدة.
3. إنشاء edge function `rewrite-query`.
4. تحديث `chat/index.ts` (التصنيف + rewrite + rerank + prompt + meta sources).
5. تحديث `chatApi.ts` لاستقبال meta sources.
6. تحديث `use-settings.ts` و `AdminSettings.tsx` بالتبويب الجديد.
7. اختبار سريع (سؤال بأرقام، سؤال عام، سؤال خارج النطاق).
