

# إضافة Custom Instruction (تعليمات مخصصة) لإعدادات المساعد

## الفكرة
إضافة حقل نصي في إعدادات المشرف يسمح بكتابة تعليمات مخصصة تُضاف تلقائياً إلى system prompt الخاص بالمساعد الذكي.

## التغييرات

### 1. `src/hooks/use-settings.ts`
- إضافة `custom_instruction: ""` إلى `AssistantSettings` interface و `DEFAULTS`

### 2. `src/pages/AdminSettings.tsx`
- إضافة حقل Textarea في تبويب الذكاء الاصطناعي بعنوان "تعليمات مخصصة" مع وصف توضيحي
- مثال placeholder: "أنت مختص بكلية الهندسة فقط..."

### 3. `supabase/functions/chat/index.ts`
- إدراج `settings.custom_instruction` في نهاية system prompt إذا لم يكن فارغاً:
```typescript
const customInstruction = settings.custom_instruction?.trim()
  ? `\n\nتعليمات إضافية:\n${settings.custom_instruction}`
  : "";
// append to systemPrompt
```

## الملفات المتأثرة
- `src/hooks/use-settings.ts` — سطر واحد في interface + سطر في DEFAULTS
- `src/pages/AdminSettings.tsx` — إضافة حقل Textarea
- `supabase/functions/chat/index.ts` — إضافة 3 أسطر في بناء system prompt

