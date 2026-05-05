## المشكلة

عند استخدام Google Grounding للإجابة من موقع الجامعة، يحدث أحد سيناريوهين:
1. يُرجع Google نصاً لكن بدون قائمة URLs في `groundingChunks` → المصدر الظاهر يبقى ملف الـ RAG فقط.
2. يُرجع URLs لكنها بعناوين طويلة غير واضحة، دون إشارة واضحة إلى أن المصدر هو "موقع الجامعة الرسمي".

## الحل

تعديل بسيط في `supabase/functions/chat/index.ts` (داخل كتلة Google Grounding، حوالي السطر 697):

عندما يُستخدم البحث المباشر بنجاح (`groundedText` غير فارغ):
- إضافة المصدر `موقع الجامعة الرسمي (ust.edu)` دائماً في مقدمة `sourceNames`، بصرف النظر عن وجود `groundingChunks`.
- إذا توفرت URLs محددة، تُضاف بعدها كمصادر فرعية.
- بهذا الشكل سيرى الطالب دائماً عبارة "موقع الجامعة الرسمي (ust.edu)" أسفل الإجابة عند استخدام Grounding.

## التفاصيل التقنية

```ts
if (groundedText) {
  liveSearchUsed = true;
  maxRank = Math.max(maxRank, 1);
  const officialLabel = `موقع الجامعة الرسمي (${domain})`;
  sourceNames = [...new Set([officialLabel, ...sourceNames, ...liveSourceNames])];
  // ...rest unchanged
}
```

لا حاجة لتعديلات أخرى — واجهة المصادر في الـ Chat تعرض `sourceNames` كما هي.

## النشر

نشر edge function `chat` فقط بعد التعديل.