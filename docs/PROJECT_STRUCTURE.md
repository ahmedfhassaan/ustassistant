# بنية المشروع — UST Assistant

هذا المستند هو **المرجع الرسمي** للبنية المعمارية للمشروع. أي كود جديد يجب أن يحترم هذه البنية.

## نظرة عامة

```text
src/
  app/                         # Bootstrap: Router, Providers, Guards
  pages/                       # صفحات مرتبطة بمسار (Route)
  features/                    # ميزات مكتفية ذاتياً
    chat/                      # كل ما يخص الشات
    admin/                     # لوحة التحكم بفروعها
    public-feedback/           # نظام التقييم العام (ثَمب أب/داون)
    export/                    # تصدير البيانات (CSV/PDF/XLSX)
  components/
    ui/                        # shadcn/ui primitives (لا تُعدَّل يدوياً)
    common/                    # مكونات عامة بلا منطق ميزة (EmptyState, ErrorState, NavLink)
  hooks/                       # هوكس عامة (cross-cutting): use-theme, use-toast, use-mobile
  lib/                         # دوال مساعدة لا تعتمد على React (utils, formatters)
  services/
    supabase/                  # طبقة رقيقة فوق Supabase client
  types/                       # أنواع TypeScript مشتركة بين الميزات
  integrations/supabase/       # ⚠️ ملفات مُولَّدة تلقائياً — لا تُعدَّل
  styles/                      # Tailwind layers + tokens (index.css)

supabase/
  functions/
    _shared/                   # Helpers مشتركة بين Edge Functions
    chat/                      # نقطة دخول الشات + RAG + الكاش
    rewrite-query/             # تحسين الاستعلام قبل البحث
    generate-embedding/        # توليد المتجهات (gemini-embedding-001)
    backfill-embeddings/       # عمليات صيانة لتعبئة المتجهات الناقصة
    process-document/          # تقسيم المستندات إلى chunks
    crawl-website/             # زحف موقع الجامعة (Firecrawl)
  migrations/                  # سكيمة DB + RPC + RLS (مصدر الحقيقة)
  config.toml                  # إعدادات المشروع (لا تُغيَّر يدوياً)
```

## مسؤولية كل مجلد

| المجلد | المسؤولية | مثال |
|---|---|---|
| `src/app/` | تركيب التطبيق الجذري: Router, Providers, AdminGuard | `App.tsx`, `main.tsx` |
| `src/pages/` | مكوّن لكل مسار، يجمع المكونات ويستدعي الخدمات | `Chat.tsx`, `AdminKnowledge.tsx` |
| `src/features/<x>/` | كل ما يخص ميزة واحدة (components, hooks, services, types) | `features/chat/components/ChatMessage.tsx` |
| `src/components/ui/` | shadcn primitives | `button.tsx`, `dialog.tsx` |
| `src/components/common/` | مكونات عامة بدون ربط بميزة | `EmptyState.tsx` |
| `src/hooks/` | هوكس مستخدمة في أكثر من ميزة | `use-theme.ts`, `use-toast.ts` |
| `src/lib/` | Helpers خالصة (pure) لا تعتمد على React | `utils.ts (cn)` |
| `src/services/supabase/` | استدعاءات Supabase فقط (طبقة رقيقة) | `students.ts`, `feedback.ts` |
| `src/types/` | أنواع TS مشتركة | `Message`, `Student`, `Source` |
| `src/integrations/supabase/` | عميل وأنواع مُولَّدة تلقائياً | `client.ts`, `types.ts` |
| `src/styles/` | CSS عام + Tailwind layers + tokens | `index.css` |
| `supabase/functions/` | Edge Functions (Deno) | `chat/index.ts` |
| `supabase/migrations/` | DDL + RPCs + RLS | `*.sql` |

## أين أضع …؟

- **صفحة جديدة** → `src/pages/<Name>.tsx` ثم سجِّلها في `src/app/App.tsx`.
- **مكون UI خاص بميزة** → `src/features/<feature>/components/<Name>.tsx`.
- **مكون UI عام** → `src/components/common/<Name>.tsx`.
- **منطق الشات (SSE, parsing, conversation state)** → `src/features/chat/services/` و `src/features/chat/hooks/`.
- **منطق RAG** → **حصراً** في `supabase/functions/chat/` و `supabase/functions/_shared/` و migrations (مثل `search_knowledge_hybrid`). **ممنوع** في الواجهة.
- **استدعاء Supabase (CRUD)** → `src/services/supabase/<domain>.ts` فقط، ثم تستهلكه الصفحات/الهوكس.
- **TypeScript types مشتركة** → `src/types/<domain>.ts`. الأنواع الخاصة بميزة واحدة → `features/<feature>/types.ts`.
- **Edge Function جديدة** → مجلد جديد داخل `supabase/functions/<name>/index.ts`، والمشترك في `_shared/`.
- **استعلام/دالة SQL** → migration جديد داخل `supabase/migrations/`.
- **سرّ/مفتاح API** → Lovable Cloud Secrets فقط، يُقرأ داخل Edge Functions عبر `Deno.env.get(...)`.

## ملفات/مجلدات لا تُعدَّل بدون سبب قاهر

| الملف | السبب |
|---|---|
| `src/integrations/supabase/client.ts` | مُولَّد تلقائياً — أي تعديل سيُمحى |
| `src/integrations/supabase/types.ts` | مُولَّد من سكيمة DB |
| `.env` | يُدار تلقائياً عبر Lovable Cloud |
| `supabase/config.toml` (مفاتيح المشروع) | إعدادات مدارة؛ يجوز فقط إضافة كتل لكل function |
| `src/components/ui/*` | shadcn — يفضَّل التخصيص عبر variants لا التعديل المباشر |
| `package-lock.json` / `bun.lock*` | تُحدَّث تلقائياً مع `bun add/remove` |

## مبادئ ثابتة

1. **Feature-first**: كل ميزة تعيش في مجلدها ولا تستورد من ميزة أخرى مباشرة.
2. **UI خالٍ من business logic**: المكونات تعرض فقط؛ المنطق في hooks/services.
3. **Supabase لا يُستدعى من المكونات**: دائماً عبر `services/supabase/`.
4. **RAG و AI و المفاتيح**: دائماً خادم (Edge Functions)، لا واجهة.
5. **Auto-generated = read-only**.
