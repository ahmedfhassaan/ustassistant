# البحث المباشر بديل كامل للزحف المخزّن

## الفكرة
عند تفعيل "البحث المباشر"، يصبح هو **مصدر الويب الوحيد**:
- يُتجاهل المحتوى المزحوف المخزّن في `knowledge_chunks` (مصادر الويب).
- يبحث Firecrawl لحظياً في موقع الجامعة فقط (`site:ust.edu`) لكل سؤال.
- المستندات المرفوعة (PDFs/Markdown) **تبقى** مصدراً مكمّلاً.
- الزحف المجدول الليلي يتوقّف تلقائياً عند التفعيل.

## السلوك في `chat`
1. تحقّق من `live_search_enabled`.
2. إذا مفعّل:
   - استخراج النطاق من `web_crawl_root_url` (مثلاً `ust.edu`).
   - استدعاء Firecrawl `/v2/search` بـ `query: "site:{domain} {question}"`، `limit: live_search_max_results`، مع `scrapeOptions.formats: ['markdown']` و `onlyMainContent: true`.
   - timeout صارم (`live_search_timeout_ms`) عبر `AbortSignal.timeout`.
   - بناء `context` من النتائج: لكل صفحة عنوان + رابط + محتوى مقتطع (~1800 حرف).
   - استدعاء RAG للمستندات فقط (تصفية `source_type = 'manual'` أو ما شابه — أو ببساطة استخدام نفس البحث ولكن **لا** نستدعي بحث الويب).
3. إذا غير مفعّل: يبقى السلوك الحالي بالكامل.
4. **Fallback**: إذا فشل Firecrawl نهائياً (شبكة/استثناء)، نُرجع رسالة `fallback_message` بدلاً من إجابة مخترعة (لأن المستخدم اختار البديل الكامل).

## الزحف المجدول
- في cron job + Edge Function `crawl-website`: التحقّق من `live_search_enabled`؛ إذا `true` نتخطّى التشغيل ونسجّل `web_crawl_last_status = 'skipped (live mode)'`.

## الإعدادات الجديدة (`assistant_settings`)
| المفتاح | الافتراضي | الوصف |
|---|---|---|
| `live_search_enabled` | `false` | تفعيل وضع البحث الحي (بديل كامل للزحف) |
| `live_search_max_results` | `4` | عدد صفحات النتائج المحضرة لكل سؤال |
| `live_search_timeout_ms` | `12000` | أقصى انتظار لـ Firecrawl قبل التراجع |

## واجهة المسؤول — `WebSourceCard.tsx`
- قسم بارز جديد أعلى البطاقة بعنوان "وضع البحث المباشر" مع `Switch`.
- عند التفعيل:
  - تنبيه أصفر: "سيتم تجاهل المحتوى المزحوف وإيقاف الزحف الليلي. كل سؤال يُكلّف استدعاء Firecrawl."
  - حقول: عدد النتائج (slider 1–8)، زمن الانتظار (input ms).
  - تعطيل (disable) قسم "الزحف وتحديث الآن" مع توضيح أنه غير ضروري في هذا الوضع.
- عند تعطيله: يعود قسم الزحف العادي.

## الأمان والاستهلاك
- مفتاح `FIRECRAWL_API_KEY` متوفر مسبقاً ضمن أسرار Edge Functions.
- الكاش الحالي (`response_cache` بـ TTL 24h) يبقى يعمل — الأسئلة المتكررة لا تستدعي Firecrawl.
- زمن استجابة متوقع 3–8 ثوان للأسئلة الجديدة (مقابل دقّة لحظية).

## الملفات المتأثرة
- `supabase/functions/chat/index.ts` — منطق Live Search + تجاوز RAG للويب.
- `supabase/functions/crawl-website/index.ts` — تخطّي التشغيل عند `live_search_enabled`.
- `src/components/admin/WebSourceCard.tsx` — قسم الوضع الحي + التعطيل المتبادل.
- migration: إدراج 3 إعدادات افتراضية في `assistant_settings`.
