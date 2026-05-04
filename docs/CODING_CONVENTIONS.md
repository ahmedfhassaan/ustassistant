# قواعد الكود — UST Assistant

قواعد إلزامية لكتابة وتعديل الكود. الهدف: كود نظيف، قابل للصيانة، بدون تكرار، وآمن.

## 1) التسمية

| النوع | النمط | مثال |
|---|---|---|
| ملف React/مكوّن | `PascalCase.tsx` | `ChatMessage.tsx` |
| Hook | `useCamelCase.ts` | `useChatStream.ts` |
| Service / utility | `camelCase.ts` | `chatApi.ts`, `formatDate.ts` |
| نوع/Interface | `PascalCase` | `Message`, `StudentRecord` |
| ثابت عام | `SCREAMING_SNAKE_CASE` | `MAX_TOKENS` |
| متغير/دالة | `camelCase` | `sendMessage` |
| مجلد ميزة | `kebab-case` | `public-feedback` |
| Edge Function | `kebab-case` | `rewrite-query` |
| ملف SQL migration | يبدأ بالطابع الزمني المُولَّد تلقائياً | `20260504...sql` |

## 2) متى أُنشئ ملفاً جديداً ومتى أُعدّل موجوداً؟

- **الأصل: التعديل**. قبل أي إنشاء ابحث بـ `rg` عن دالة/مكوّن مشابه.
- أنشئ ملفاً جديداً فقط إذا:
  - لا يوجد ملف بنفس المسؤولية.
  - الإضافة ستُضخِّم ملفاً موجوداً بشكل غير مبرر (> 300 سطر منطقياً).
  - المسؤولية مختلفة معمارياً (مثل خدمة جديدة لـ domain جديد).
- لا تُكرّر ملفاً بنسخة مشابهة (`*Copy`, `*New`, `*v2`). حدِّث الموجود.

## 3) معالجة الأخطاء

- كل استدعاء شبكة/Supabase داخل `try/catch` في طبقة الـ service.
- لا تُكتم الأخطاء صامتاً (`catch {}` ممنوع بدون تعليق توضيحي).
- الرسالة للمستخدم بالعربية، عبر `useToast` أو `<ErrorState />`.
- سجِّل التفاصيل التقنية بـ `console.error` لتسهيل التصحيح.
- في Edge Functions: أعِد `{ error: string }` مع status مناسب، ولا تُسرِّب رسائل النظام.

```ts
// مثال: services/supabase/students.ts
export async function listStudents() {
  const { data, error } = await supabase.rpc("admin_list_students");
  if (error) {
    console.error("listStudents failed", error);
    throw new Error("تعذّر تحميل قائمة الطلاب");
  }
  return data ?? [];
}
```

## 4) قواعد TypeScript

- تجنّب `any`. إن لزم استعمل `unknown` ثم ضيِّق النوع.
- استورد أنواع DB من `@/integrations/supabase/types` (`Database["public"]["Tables"][...]`).
- الأنواع المشتركة بين أكثر من ميزة → `src/types/`.
- الأنواع الخاصة بميزة واحدة → `src/features/<feature>/types.ts`.
- `Props` لكل مكوّن مُعرَّفة كـ `interface` أو `type` فوق المكوّن.
- لا تعتمد على inferred types في حدود الوحدات (export صريح للنوع).

## 5) منع التكرار (DRY)

- قبل كتابة دالة: ابحث في `lib/`, `services/`, `hooks/`, `features/<x>/`.
- إذا تكرّر منطق في مكوّنين → ارفعه إلى hook أو service.
- إذا تكرّرت أنواع مماثلة → وحِّدها في `src/types/`.
- ممنوع وجود نسختين من نفس الـ RPC أو نفس الدالة بأسماء مختلفة.

## 6) لا business logic داخل المكوّنات

- المكوّنات: استقبال props، عرض UI، إطلاق أحداث.
- المنطق (fetching, validation, transformations) → hooks أو services.
- لا تُجرِ حسابات معقدة داخل JSX؛ احسبها في `useMemo` أو دالة منفصلة.

```tsx
// ❌ سيئ
<div>{users.filter(u => u.active).map(u => u.name).join("، ")}</div>

// ✅ جيد
const activeNames = useMemo(
  () => users.filter(u => u.active).map(u => u.name).join("، "),
  [users]
);
<div>{activeNames}</div>
```

## 7) استخدام `features/` لكل ميزة

- ميزة = (components + hooks + services + types) في مجلد واحد.
- ميزة لا تستورد من ميزة أخرى مباشرة. إن احتاجت شيئاً مشتركاً → ارفعه إلى `components/common`, `hooks/`, `lib/`, أو `types/`.
- صفحات `pages/` تُركّب من ميزات؛ لا تحتوي منطقاً ثقيلاً.

## 8) `services/supabase/` طبقة رقيقة

- مسؤوليتها: استدعاء `supabase.from(...)` أو `supabase.functions.invoke(...)` ثم إرجاع البيانات أو رمي خطأ بعربية واضحة.
- ممنوع داخلها: JSX، `useState`، عرض toasts، تحويلات UI معقدة.
- مسموح: التحقق من النتيجة، normalization بسيط، إعادة تشكيل لنوع TS.

## 9) ممنوع منطق RAG في الواجهة

- لا تنفيذ embeddings، لا hybrid search، لا حساب thresholds في `src/`.
- الواجهة تُرسل الأسئلة فقط إلى Edge Function `chat`.
- أي تطوير لـ RAG → في `supabase/functions/chat` و `_shared` و migrations.

## 10) تنسيق Imports

- الترتيب: مكتبات خارجية → مكتبات Lovable/shadcn → ملفات `@/` → ملفات نسبية → أنماط CSS.
- استخدم alias `@/` دائماً بدل `../../..`.

## 11) أمان أساسي

- ممنوع تخزين secrets في الكود أو `.env` يدوياً.
- ممنوع `dangerouslySetInnerHTML` بدون مبرر موثَّق.
- جميع جداول DB يجب أن تملك RLS مناسب (راجع migrations عند الإضافة).
