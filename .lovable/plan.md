# خطة: إنشاء نظام قواعد ثابت للمشروع (/docs)

لن يتم تعديل أي كود تطبيقي. سيتم فقط إنشاء مجلد `/docs` يحوي 4 ملفات Markdown مرجعية.

## الملفات التي ستُنشأ

```text
docs/
  PROJECT_STRUCTURE.md
  CODING_CONVENTIONS.md
  DECISIONS.md
  AI_WORKFLOW_RULES.md
```

---

## 1) `docs/PROJECT_STRUCTURE.md`

مرجع رسمي للبنية المعمارية. سيحتوي على:

- شجرة المجلدات المعتمدة (`src/app`, `src/pages`, `src/features/{chat,admin,public-feedback,export}`, `src/components/{ui,common}`, `src/hooks`, `src/lib`, `src/services/supabase`, `src/types`, `src/integrations/supabase`, `src/styles`، و `supabase/{functions,migrations,config.toml}`).
- جدول لمسؤولية كل مجلد + أمثلة من المشروع الحالي.
- قواعد التموضع:
  - **الصفحات** → `src/pages/` (مثل `Chat.tsx`, `AdminKnowledge.tsx`).
  - **مكونات الواجهة** → `src/components/ui` (shadcn) و `src/components/common` (EmptyState, ErrorState, NavLink). المكونات الخاصة بميزة → داخل `features/<feature>/components`.
  - **منطق الشات** → `src/features/chat/` (هوكس، خدمات SSE، أنواع، مكونات Chat*).
  - **منطق RAG** → حصراً في `supabase/functions/chat` و `supabase/functions/_shared` و migrations (دوال SQL مثل `search_knowledge_hybrid`). ممنوع في الواجهة.
  - **خدمات Supabase** → `src/services/supabase/<domain>.ts` كطبقة رقيقة (students, knowledge, feedback, settings, chatLogs).
  - **TypeScript types** → `src/types/` للأنواع المشتركة، أنواع داخلية لميزة معينة في `features/<feature>/types.ts`.
  - **Edge Functions** → `supabase/functions/<name>/index.ts` + المشترك في `_shared`.
- قسم **ملفات يُمنع تعديلها يدوياً**: `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `.env`, `supabase/config.toml` (الإعدادات على مستوى المشروع).

## 2) `docs/CODING_CONVENTIONS.md`

- **التسمية**: ملفات React بصيغة `PascalCase.tsx`، الهوكس `useCamelCase.ts`، الخدمات والـ utils `camelCase.ts`، ثوابت `SCREAMING_SNAKE_CASE`.
- **متى ننشئ ملفاً جديداً**: فقط إذا لم يوجد ملف بالمسؤولية نفسها؛ قبل ذلك يجب البحث عبر `rg`. التعديل دائماً مفضّل على الإنشاء.
- **معالجة الأخطاء**: try/catch في الخدمات، رسائل عربية واضحة، عرضها عبر `useToast` أو `ErrorState`. لا تُكتم الأخطاء.
- **TypeScript**: تجنب `any`، تعريف الأنواع المشتركة في `src/types`، استخدام `Database` من `integrations/supabase/types.ts`.
- **منع التكرار**: قبل كتابة دالة جديدة ابحث في `lib/`, `services/`, `hooks/`. الدوال المتشابهة تُدمج.
- **منع business logic داخل components**: المكونات تستقبل props وتعرض UI فقط؛ المنطق في hooks/services.
- **features**: كل ميزة مكتفية ذاتياً (components, hooks, services, types) ولا تستورد من ميزة أخرى.
- **services/supabase**: طبقة رقيقة — استدعاء `supabase.from(...)` أو `supabase.functions.invoke(...)` وإرجاع البيانات/الخطأ، بدون منطق UI أو تحويلات معقدة.
- **منطق RAG**: ممنوع في frontend؛ يُستدعى عبر edge function `chat` فقط.

## 3) `docs/DECISIONS.md`

سجل ADR مبسّط بصيغة جدول:

| القرار | السبب | التاريخ | الحالة |
|---|---|---|---|
| Feature-first architecture | عزل الميزات وتسهيل التطور | 2026-05-04 | معتمد |
| Supabase (Lovable Cloud) كقاعدة بيانات | تكامل مدمج بدون إعداد خارجي | 2026-05-04 | معتمد |
| Edge Functions للعمليات الحساسة | حماية المفاتيح وأداء أفضل | 2026-05-04 | معتمد |
| عدم كشف API keys في الواجهة | أمان | 2026-05-04 | معتمد |
| فصل UI عن business logic | قابلية الصيانة والاختبار | 2026-05-04 | معتمد |
| استخدام RAG (pgvector + FTS) | إجابات مبنية على معرفة الجامعة | 2026-05-04 | معتمد |
| `integrations/supabase` auto-generated فقط | يُحدَّث تلقائياً، التعديل اليدوي يكسر التزامن | 2026-05-04 | معتمد |
| Direct Gemini API عبر Edge Functions | تحكم كامل بالنماذج والتدفق | 2026-05-04 | معتمد |
| نشر على Cloudflare Pages كموقع ثابت | أداء وتوزيع عالميان | 2026-05-04 | معتمد |

مع قسم لإضافة قرارات مستقبلية بنفس التنسيق.

## 4) `docs/AI_WORKFLOW_RULES.md`

قواعد إلزامية لأي عمل قادم من المساعد الذكي:

- **قبل كتابة أي كود**:
  1. قراءة ملفات `/docs` الأربعة.
  2. البحث عن كود موجود متعلق بالمهمة (`rg`).
  3. شرح الملفات التي سيتم تعديلها.
  4. شرح سبب كل تعديل.
  5. الانتظار للموافقة قبل التنفيذ.
- **ممنوعات**:
  - إنشاء ملف جديد إذا كان يمكن تعديل ملف موجود.
  - تكرار دالة/منطق موجود.
  - استدعاء Supabase مباشرة من components (يجب المرور عبر `services/supabase`).
  - وضع مفاتيح/أسرار في frontend.
  - وضع منطق RAG في الواجهة.
  - تعديل `integrations/supabase/*`, `.env`, أو إعدادات المشروع في `config.toml`.
- **بعد كل تعديل** يُعرض تقرير يتضمن:
  - الملفات المعدّلة.
  - سبب كل تعديل.
  - المخاطر المحتملة.
  - كيفية الرجوع عن التعديل.

---

## ما لن يحدث

- لا تعديل لأي ملف داخل `src/` أو `supabase/`.
- لا نقل ملفات ولا refactor.
- لا تغييرات على قاعدة البيانات.

## بعد الموافقة

سأقوم فقط بـ:
1. إنشاء `docs/PROJECT_STRUCTURE.md`
2. إنشاء `docs/CODING_CONVENTIONS.md`
3. إنشاء `docs/DECISIONS.md`
4. إنشاء `docs/AI_WORKFLOW_RULES.md`

ثم أعرض ملخصاً لمحتوى كل ملف.
