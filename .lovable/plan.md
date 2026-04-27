## Stop Streaming Feature

البنية التحتية شبه جاهزة: `Chat.tsx` يستخدم بالفعل `AbortController` مخزّناً في `abortRef`، ويتجاهل `AbortError`. الناقص هو: زر إيقاف في الواجهة، ومنع الإرسال أثناء التوليد، وحفظ الجزء المُولَّد عند الإيقاف.

### التغييرات

**1) `src/components/ChatInput.tsx`**
- إضافة prop جديد: `onStop: () => void`.
- عندما يكون `isLoading = true`: استبدال زر الإرسال (سهم `ArrowUp`) بزر إيقاف (أيقونة `Square` من lucide-react) بنفس الشكل والحجم والألوان والـ glow، مع `aria-label="إيقاف"` و `title="إيقاف"`.
- زر الإيقاف **ليس** disabled أثناء التحميل ويستدعي `onStop()`.
- منع الإرسال عبر Enter أو الزر أثناء `isLoading` (موجود جزئياً، نتأكد منه).
- التعامل مع textarea: إبقاؤه قابلاً للكتابة حتى أثناء التوليد لا بأس، لكن `handleSubmit` يبقى محظوراً.

**2) `src/pages/Chat.tsx`**
- إضافة دالة `handleStop`:
  ```ts
  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
    // حفظ الجزء المُولَّد كرسالة مساعد عادية في قاعدة البيانات
  };
  ```
- عند الإيقاف، إذا كان `assistantContent` غير فارغ: تكوين `assistantMsg` بنفس منطق `onDone` (تنظيف وسم المصادر) وحفظه في DB (محادثة جديدة أو إضافة لمحادثة قائمة) — لضمان بقاء الجزء المُولَّد بعد إعادة التحميل أيضاً، وليس فقط في الـ state.
- نقل منطق الحفظ (DB save) من داخل `onDone` إلى دالة مساعدة `persistAssistantMessage(content, userMsg, assistantId, questionText)` لإعادة استخدامها في `handleStop`.
- استخدام `useRef` لتتبع `assistantContent` و `userMsg` و `assistantId` الحاليين حتى يستطيع `handleStop` الوصول إليها (لأنها حالياً locals داخل `handleSend`). أو الأبسط: استخراجها كـ refs (`currentStreamRef`).
- تمرير `onStop={handleStop}` إلى `<ChatInput>`.
- التأكد من أن `handleSend` يرجع فوراً إذا `isLoading` (موجود).

**3) معالجة الأخطاء**
- `AbortError` متجاهل بالفعل في catch (السطر 164). لا تغيير.

**4) HMR/تنظيف**
- في `useEffect` cleanup عند unmount: `if (abortRef.current) abortRef.current.abort()` لتفادي التسريب (اختياري لكن جيد).

### تفاصيل تقنية للـ UI
- الأيقونة: `Square` من `lucide-react` بحجم `w-4 h-4` ممتلئة قليلاً (`fill-current`) لتبدو كزر stop واضح.
- نفس الـ classes الحالية للزر (نفس اللون الأزرق الأساسي والـ glow في الوضع الداكن) للحفاظ على الهوية البصرية و RTL.
- لا تغيير في `chatApi.ts` — الـ `signal` يُمرَّر بالفعل ويُلغي fetch فعلياً عند الإحباط.

### الملفات المعدَّلة
- `src/components/ChatInput.tsx`
- `src/pages/Chat.tsx`
