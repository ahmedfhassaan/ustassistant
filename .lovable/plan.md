## المشكلة
الخطأ الظاهر في الواجهة:
> Failed to execute 'getReader' on 'ReadableStream': ReadableStreamDefaultReader constructor can only accept readable streams that are not yet locked to a reader

السبب الحقيقي:
1. الـ Edge Function يعيد حالياً JSON بشكل `{ "error": "⚠️ تم تجاوز حد الطلبات...", "fallback": true, "status": 429 }` مع HTTP 200 (بسبب 429 من Gemini quota).
2. في `src/lib/chatApi.ts` (السطور 33-41) عند رؤية `content-type: application/json`، الكود يستدعي `resp.json()` ثم يفحص فقط `data.cached`. عندما لا يكون `cached`، يسقط الكود إلى أسفل ويحاول `resp.body.getReader()` — لكن body استُهلك سابقاً → stream مقفول → استثناء في الواجهة.
3. النتيجة: المستخدم يرى خطأ تقني غير مفهوم بدل رسالة "تم تجاوز حد الطلبات".

## التعديل
ملف واحد فقط: `src/lib/chatApi.ts` — معالجة حالة الـ JSON بشكل كامل والخروج (return أو throw) قبل الوصول إلى `getReader()`.

التعديل في الكتلة بين السطور 33-41:
- بعد `await resp.json()`:
  - إذا كان `data.error` موجوداً → `throw new Error(data.error)` (الواجهة تعرض الرسالة العربية الحقيقية).
  - إذا كان `data.cached && data.content` → استدعاء `onDelta` و`onDone` كما هو الآن، ثم `return`.
  - أي شكل JSON آخر غير متوقع → `throw new Error("استجابة غير متوقعة من المساعد")`.

بهذا لن يصل التنفيذ أبداً إلى `resp.body.getReader()` بعد أن يكون الـ body قد استُهلك.

## ملاحظة جانبية
رسالة 429 ذاتها سببها تجاوز الحصة المجانية في Gemini API (مشكلة من جانب Google). هذا الإصلاح فقط يضمن **عرض الرسالة بشكل صحيح** للمستخدم بدل الخطأ التقني. يمكن لاحقاً تخفيف الضغط على الـ API (تفعيل cache، تأخير بين الطلبات، إلخ) عند الحاجة.

## الاختبار
بعد التعديل، إعادة إرسال السؤال: ستظهر رسالة "⚠️ تم تجاوز حد الطلبات. يرجى المحاولة بعد دقيقة." بشكل واضح بدل الخطأ الإنجليزي.
