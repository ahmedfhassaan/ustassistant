

# إصلاح تسجيل حالة cached في chat_logs

## المشكلة
عند إرجاع رد من الكاش، يُسجَّل في `chat_logs` بقيمة `cached: false` — مما يجعل إحصائية "الردود المخدومة من الكاش" دائماً صفر.

## الإصلاح
في `supabase/functions/chat/index.ts` السطر ~171-176، إضافة `cached: true` و `category` إلى insert:

```typescript
await supabase.from("chat_logs").insert({
  question: lastUserMessage,
  question_hash: questionHash,
  sources: cached.sources,
  user_id: userId,
  cached: true,
  category: classifyQuestion(lastUserMessage),
});
```

## الملفات المتأثرة
- `supabase/functions/chat/index.ts` — تعديل سطر واحد

