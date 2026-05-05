## المشكلة

البوابة الحالية لتفعيل Google Grounding:
```
docsInsufficient = maxRank < threshold || sourceNames.length === 0
trigger if (liveSearchEnabled && (docsInsufficient || explicitWeb))
```

في سؤال "اذكر المجلات العلمية": rank=0.916 و5 مصادر، فاعتُبرت كافية — لكنها لم تكن تحتوي إجابة فعلية. النتيجة: fallback بدون استدعاء Grounding.

## الحل: فحص كفاية سريع قبل الرد (LLM Sufficiency Gate)

قبل توليد الرد النهائي، نُجري **استدعاء سريع جداً** لـ `gemini-2.5-flash-lite` نسأله:

> "بناءً على المقاطع التالية، هل تكفي للإجابة الكاملة على سؤال المستخدم؟ أجب بكلمة واحدة فقط: YES أو NO."

- إذا `NO` → نُفعّل Google Grounding تلقائياً (نفس مسار `explicitWeb`)، حتى لو كان rank مرتفعاً.
- إذا `YES` → نُكمل عادياً بدون Grounding.
- إذا فشل الاستدعاء أو تجاوز 3 ثوانٍ → نعتبره `YES` (لا نُعطّل التدفق).

### نقاط التطبيق في `supabase/functions/chat/index.ts`

1. بعد بناء `docsContext` وقبل بوابة Live Search (~السطر 647)، نضيف:
   ```ts
   let docsAnswerable = true;
   if (liveSearchEnabled && docsContext && !docsInsufficient && !explicitWeb) {
     docsAnswerable = await checkSufficiency(lastUserMessage, docsContext);
   }
   ```
2. تعديل الشرط:
   ```ts
   if (liveSearchEnabled && (docsInsufficient || explicitWeb || !docsAnswerable)) { ... }
   ```
3. عند `!docsAnswerable` نُعامله كـ `explicitWeb` لأولوية المصدر الويب في الـ system prompt.
4. إضافة دالة `checkSufficiency()` تستخدم `gemini-2.5-flash-lite` مع `maxOutputTokens: 5` و `AbortSignal.timeout(3000)`.

### مزايا

- لا تأخير محسوس (طلب قصير ~300-700ms، فقط عند توفر مستندات وعدم وجود تفعيل صريح).
- يمنع fallback الكاذب عندما تكون مقاطع الـ RAG ذات rank عالٍ لكنها لا تجيب.
- لا يؤثر على الكاش (الكاش يعمل قبل هذه المرحلة).

## النشر

نشر edge function `chat`.