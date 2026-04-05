

# تفعيل خاصية "المستخدمون النشطون"

## المشكلة الحالية
واجهة الدردشة لا ترسل `user_id` (الرقم الجامعي) إلى الخادم عند إرسال الأسئلة، مما يجعل حقل `user_id` في جدول `chat_logs` دائماً فارغاً (null)، وبالتالي يظهر عدد المستخدمين النشطين = 0.

## الحل

### 1. تحديث `src/lib/chatApi.ts`
إضافة حقل `user_id` إلى بيانات الطلب المرسلة إلى edge function:
- إضافة `userId` كمعامل اختياري في `StreamChatOptions`
- إرسال `user_id` في body الطلب

### 2. تحديث `src/pages/Chat.tsx`
تمرير الرقم الجامعي للطالب (`student.id`) عند استدعاء `streamChat`.

### 3. تحديث `supabase/functions/chat/index.ts`
استخراج `user_id` من body الطلب مباشرة بدلاً من محاولة قراءته من المحادثات، وتمريره عند تسجيل السؤال في `chat_logs`.

## التفاصيل التقنية
- في `chatApi.ts`: إضافة `userId?: string` للواجهة وإرساله في `JSON.stringify({ messages, user_id: userId })`
- في `Chat.tsx`: تمرير `userId: student?.id` عند استدعاء `streamChat`
- في edge function: قراءة `const userId = body.user_id || null` واستخدامه في جميع عمليات `insert` لـ `chat_logs`

