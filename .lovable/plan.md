## الهدف
معالجة فشل Google Grounding الصامت وحل مشكلة تجاوز حصة `gemini-3-flash-preview`.

## التعديلات على `supabase/functions/chat/index.ts`

### 1. رفع المهلة الافتراضية لـ Grounding
- السطر 171: تغيير `live_search_timeout_ms` الافتراضي من `"12000"` إلى `"20000"`.
- السطر 658: تغيير الحد الأدنى المسموح من 12000 إلى 20000 ms.

### 2. سجلات تشخيصية واضحة لـ Grounding (السطور 660–715)
- إضافة `console.log` يطبع: `timeoutMs` المستخدم، حجم الـ chunks المُرجعة، طول النص.
- في `catch`: التمييز بين `TimeoutError`/`AbortError` وأنواع الأخطاء الأخرى وطباعة `e.name` و `e.message` و `e.stack`.
- إضافة `console.log` بعد `await fetch` مباشرة لتأكيد عودة الاستجابة.

### 3. تغيير النموذج الافتراضي
- السطر 821: تغيير القيمة الافتراضية من `"gemini-3-flash-preview"` إلى `"gemini-2.5-flash"` (لأن الحصة المجانية للأول استُنفدت).
- تحديث القيمة الافتراضية في `assistant_settings.ai_model` عبر migration بسيط لتكون `gemini-2.5-flash`.

### 4. تحديث UI البطاقة
في `src/components/admin/WebSourceCard.tsx`:
- تغيير الحد الأدنى لحقل `live-timeout` من `3000` إلى `15000` لتجنّب اختيار قيم منخفضة.
- تحديث القيمة الافتراضية في `useState` من 12000 إلى 20000.

### 5. تحديث قاعدة البيانات
- migration: `UPDATE assistant_settings SET value = '20000' WHERE key = 'live_search_timeout_ms'`.
- migration: `UPDATE assistant_settings SET value = 'gemini-2.5-flash' WHERE key = 'ai_model'`.

## النشر
نشر دالة `chat` فوراً بعد التعديل، ثم اختبار السؤال نفسه ومراجعة السجلات للتأكد من ظهور `[chat] GOOGLE GROUNDING got N sources` أو رسالة خطأ واضحة.
