## نطاق العمل

تنفيذ ثلاث مراحل تحسين على نظام RAG (مع تأجيل إصلاحات الأمان):

- **المرحلة B**: تحسين Chunking + إعادة معالجة الوثائق
- **المرحلة C**: Semantic Cache (تخزين دلالي ذكي)
- **المرحلة D**: Golden Dataset + لوحة Metrics للمراقبة

---

## المرحلة B — تحسين Chunking وإعادة المعالجة

**التشخيص**: منطق التقطيع `splitMarkdownAware` موجود ويستخدم 280 كلمة + overlap 50، لكن **الوثائق الـ13 الحالية لم يُعَد تقطيعها بعد** — لا تزال متوسط 3,178 حرف/chunk (بدلاً من ~1,800 المستهدف).

**الإجراءات**:
1. **تحسين بسيط في `splitMarkdownAware`** (`process-document/index.ts`):
   - تقليل `MIN_WORDS` من 60 إلى 40 لمنع دمج الأجزاء الصغيرة قسراً.
   - إضافة "soft break" عند نهاية الفقرة إذا تجاوز الحجم 70% من الهدف (لتجنب chunks عملاقة).
2. **زر "إعادة معالجة الكل"** في صفحة `/admin/knowledge`:
   - يستدعي `process-document` بـ `from_existing_chunks: true` لكل وثيقة بحالة `processed`.
   - شريط تقدم يعرض الوثيقة الجارية + عدد الأجزاء المنتجة.
3. **تشغيل العملية مرة واحدة** على الـ13 وثيقة الحالية بعد النشر.

**الناتج المتوقع**: ~60-90 chunk بدلاً من 20، متوسط ~1,500 حرف.

---

## المرحلة C — Semantic Cache (تخزين دلالي)

**المشكلة**: الكاش الحالي يستخدم `hashQuestion()` (string hashing)، فلا يتطابق إلا مع نص حرفي مطابق → معدل الإصابة 8.8%.

**الإجراءات**:
1. **تعديل جدول `response_cache`**:
   - إضافة عمود `question_embedding vector(768)`.
   - إضافة فهرس `ivfflat` للبحث الدلالي السريع.
2. **دالة Postgres `find_cached_answer`**:
   - تبحث عن أقرب سؤال محفوظ (cosine similarity) ضمن عتبة `0.92` (قابلة للضبط).
   - تتجاهل المنتهي صلاحيته.
3. **تعديل `chat/index.ts`**:
   - عند الطلب: حساب embedding للسؤال (موجود أصلاً للبحث) ثم تمريره إلى `find_cached_answer` قبل تشغيل RAG كاملاً.
   - عند الحفظ في `response_cache`: تخزين embedding أيضاً.
4. **إعداد جديد في `assistant_settings`**:
   - `semantic_cache_threshold` (افتراضي `0.92`) — قابل للضبط من `/admin/settings`.

**الناتج المتوقع**: رفع cache hit rate إلى 30-50% + توفير في تكلفة Gemini API.

---

## المرحلة D — Golden Dataset + Metrics

**الهدف**: قياس جودة النظام بشكل قابل للتكرار بدلاً من الانطباعات.

**الإجراءات**:
1. **جدول جديد `golden_questions`**:
   ```
   id, question, expected_answer_keywords (text[]), 
   expected_sources (text[]), category, created_at
   ```
2. **جدول `evaluation_runs`**:
   ```
   id, run_at, question_id, generated_answer, generated_sources,
   latency_ms, confidence, keyword_match_score, source_match_score, passed
   ```
3. **صفحة جديدة `/admin/evaluation`**:
   - **تبويب "الأسئلة الذهبية"**: CRUD لإدارة بنك الأسئلة (يبدأ بـ20 سؤالاً نموذجياً).
   - **تبويب "تشغيل التقييم"**: زر يشغّل كل الأسئلة عبر `chat` ويسجّل النتائج.
   - **تبويب "النتائج"**: جدول مقارن (آخر تشغيلين) + نسبة النجاح + متوسط الكمون.
4. **لوحة Metrics في `/admin` الرئيسية** (إضافة بطاقات):
   - متوسط زمن الاستجابة (آخر 24h)
   - معدل إصابة الكاش (cache + semantic cache منفصلين)
   - متوسط الـ confidence
   - عدد ردود "لا أعرف" (fallback rate)
   - استهلاك tokens التقريبي (إن أمكن من logs)

---

## التفاصيل التقنية

| المكوّن | تغييرات |
|--------|---------|
| `supabase/functions/process-document/index.ts` | تحسين MIN_WORDS + soft break |
| `supabase/functions/chat/index.ts` | استبدال البحث في الكاش بـ semantic lookup + حفظ embedding |
| Migrations جديدة | `response_cache.question_embedding`, جدولا `golden_questions` و `evaluation_runs`, دالة `find_cached_answer`, إعداد `semantic_cache_threshold` |
| `src/pages/AdminKnowledge.tsx` | زر "إعادة معالجة الكل" + شريط تقدم |
| `src/pages/AdminEvaluation.tsx` (جديد) | صفحة Golden Dataset والتقييم |
| `src/pages/AdminDashboard.tsx` | بطاقات Metrics الجديدة |
| `src/pages/AdminSettings.tsx` | حقل `semantic_cache_threshold` |
| Routing في `App.tsx` + Sidebar | إضافة رابط `/admin/evaluation` |

**ملاحظة**: لن يتم تعديل سياسات RLS أو هيكلة كلمات المرور (مؤجل حسب طلبك).

---

## ترتيب التنفيذ

1. Migration واحدة شاملة (الأعمدة + الجداول + الدوال + الإعدادات).
2. تحديث Edge Functions ونشرها.
3. تحديثات الواجهة (Admin pages).
4. اختبار: تشغيل "إعادة معالجة الكل" مرة + إضافة 20 سؤال ذهبي + تشغيل التقييم الأول.