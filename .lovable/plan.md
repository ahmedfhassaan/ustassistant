

# إزالة نماذج OpenAI وإبقاء نماذج Google فقط

## السبب
النظام يستدعي Google AI API مباشرة عبر `GOOGLE_AI_API_KEY`. نماذج OpenAI (`gpt-5`, `gpt-5-mini`) لا تعمل عبر هذا المفتاح وستسبب أخطاء إذا اختارها المشرف.

## التغيير
في `src/pages/AdminSettings.tsx` — تعديل مصفوفة `modelOptions` لإزالة نماذج OpenAI وإبقاء نماذج Google المتاحة فعلياً:

```typescript
const modelOptions = [
  { value: "gemini-3-flash-preview", label: "Gemini 3 Flash (سريع)" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (متوازن)" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro (متقدم)" },
];
```

> ملاحظة: يجب أيضاً إزالة بادئة `google/` من أسماء النماذج لأن Google AI API تستخدم اسم النموذج بدون بادئة (مثل `gemini-2.5-flash` وليس `google/gemini-2.5-flash`). سيتم التأكد من أن دالة `chat` في Edge Function تتعامل مع الاسم بشكل صحيح.

## الملفات المتأثرة
- `src/pages/AdminSettings.tsx` — تعديل `modelOptions`
- قد يلزم تعديل `supabase/functions/chat/index.ts` إذا كان يُزيل البادئة يدوياً

