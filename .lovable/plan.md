

# تحويل توليد النصوص إلى Google AI مباشرة — لتقليل التكاليف

## الفكرة
استخدام مفتاح `GOOGLE_AI_API_KEY` الموجود بالفعل لتوليد النصوص عبر Google Gemini API مباشرة، بدلاً من Lovable AI Gateway. هذا يلغي استهلاك رصيد Lovable AI ويستخدم حصة Google المجانية/المدفوعة مباشرة.

## التغييرات المطلوبة

### 1. تعديل `supabase/functions/chat/index.ts`
- **استبدال** استدعاء `https://ai.gateway.lovable.dev/v1/chat/completions` بـ Google Gemini API:
  ```
  POST https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse&key=API_KEY
  ```
- **تحويل صيغة الرسائل** من OpenAI format إلى Google Gemini format:
  - `system` → `systemInstruction`
  - `user`/`assistant` → `contents` بأدوار `user`/`model`
- **تحويل صيغة SSE الصادرة**: Google ترسل بصيغة مختلفة (`candidates[0].content.parts[0].text`). سنحولها إلى نفس صيغة OpenAI SSE حتى لا نغير الـ frontend
- **استخدام** `GOOGLE_AI_API_KEY` بدل `LOVABLE_API_KEY` (مع إبقاء fallback لـ Lovable إذا أردت لاحقاً)
- **ربط اسم النموذج**: تحويل `google/gemini-3-flash-preview` → `gemini-3-flash-preview` (حذف البادئة `google/`)

### 2. لا تغيير في الـ Frontend
- `chatApi.ts` يبقى كما هو — سنرسل نفس صيغة SSE من الـ Edge Function

### 3. لا تغيير في إعدادات النموذج
- صفحة الإعدادات تبقى كما هي — المشرف يختار النموذج والدالة تستخدمه

## ملاحظات
- Google Gemini API لها حصة مجانية سخية (15 طلب/دقيقة مجاناً)
- الحصة المدفوعة أرخص بكثير من Lovable AI Gateway
- نماذج Google المتاحة مباشرة: `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-3-flash-preview` وغيرها
- نماذج OpenAI (مثل `gpt-5`) لن تكون متاحة عبر Google API — فقط نماذج Google

## الملفات المتأثرة
- `supabase/functions/chat/index.ts` — تعديل قسم استدعاء AI فقط

