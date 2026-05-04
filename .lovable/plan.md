# تفعيل البحث المباشر عند الطلب الصريح

## المشكلة الحالية

في `supabase/functions/chat/index.ts` (سطر 480):

```ts
if (liveSearchEnabled && docsInsufficient) { ... }
```

البحث المباشر يعمل **فقط** عندما تكون المستندات المحلية ضعيفة الصلة. لذلك عند سؤال:
> "اذكر امتيازات الجامعة من موقع ويب الجامعة الرسمي"

تم استرجاع مستند `دليل طالب جامعة العلوم والتكنولوجيا.md` بدرجة صلة عالية، فتم تجاوز البحث المباشر، رغم أن نية المستخدم واضحة.

## الحل المقترح

### 1) إضافة دالة كشف "النية الصريحة للبحث على الويب"

في `supabase/functions/chat/index.ts`، أضف دالة قبل `serve()`:

```ts
function userExplicitlyWantsWeb(text: string): boolean {
  const t = text.toLowerCase();
  const triggers = [
    "من موقع", "من الموقع", "موقع الجامعة", "الموقع الرسمي",
    "ابحث في الموقع", "ابحث على الإنترنت", "ابحث في الانترنت",
    "بحث مباشر", "من الويب", "من الانترنت", "من الإنترنت",
    "جديد", "محدّث", "محدث", "آخر تحديث", "أحدث",
  ];
  return triggers.some(k => t.includes(k));
}
```

### 2) تعديل شرط تفعيل البحث المباشر (سطر 478-480)

```ts
const explicitWeb = userExplicitlyWantsWeb(lastUserMessage);
const docsInsufficient = maxRank < confThresholdFraction;
if (liveSearchEnabled && (docsInsufficient || explicitWeb)) {
  ...
}
```

### 3) عندما تكون النية صريحة، إعطاء الأولوية للنتائج المباشرة في prompt

عند `explicitWeb = true`، اعكس ترتيب الدمج (سطر 546):

```ts
knowledgeContext = explicitWeb && liveContext
  ? (liveContext + (docsContext || ""))
  : ((docsContext || "") + (liveContext || ""));
```

وأضف توجيه في `systemPrompt` (سطر 587-620) يؤكد للنموذج: عندما تتوفر "معلومات مباشرة من موقع الجامعة"، **اعتمدها أولاً** وقم بصياغة الإجابة منها، ثم اذكر المستندات المحلية كمكمّل فقط.

### 4) (اختياري) إيقاف الكاش عند الطلب الصريح

عند `explicitWeb = true`، تجاوز `cached`/`semanticCache` لأن المستخدم يريد بيانات حيّة:

```ts
if (cached && settings.cache_enabled === "true" && !explicitWeb) { ... }
```

## الملفات المعدَّلة

- `supabase/functions/chat/index.ts` (تعديل واحد، إضافات صغيرة فقط — لا إنشاء ملفات جديدة، متوافق مع `docs/AI_WORKFLOW_RULES.md`).

## المخاطر

- **استهلاك Firecrawl**: زيادة طفيفة في عدد الاستدعاءات (مرتبطة فقط بالأسئلة التي تحتوي كلمات صريحة).
- **زمن الاستجابة**: +2–5 ثوانٍ في الأسئلة الصريحة (محدود بـ `live_search_timeout_ms = 12s`).
- **اعتمادية على الكلمات المفتاحية**: قائمة `triggers` ثابتة. يمكن لاحقاً استخدام `rewrite-query` لتصنيف النية بدقة أعلى.

## كيفية الرجوع

التراجع عن تعديل واحد في `supabase/functions/chat/index.ts`:
- حذف دالة `userExplicitlyWantsWeb`.
- استرجاع شرط `if (liveSearchEnabled && docsInsufficient)` كما كان.
- استرجاع سطر دمج `knowledgeContext`.

## بعد التطبيق

سأختبر بسؤالين:
1. "اذكر امتيازات الجامعة من موقع ويب الجامعة الرسمي" → يجب أن يستخدم Firecrawl ويُرجع مصادر بـ URL.
2. "ما هي شروط الانسحاب؟" → يجب أن يستخدم المستندات المحلية كالمعتاد.
