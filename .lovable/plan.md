## الهدف
السماح للمساعد باستخدام المعرفة العامة التعليمية **فقط** عندما يطلب الطالب توضيحاً لإجابة سؤال من «نماذج الامتحانات السابقة»، مع عرض تنبيه واضح للطالب.

---

## 1) `supabase/functions/chat/index.ts`

### أ. كشف نية الشرح (بعد `FOLLOW_UP_PHRASES` ~ السطر 53)
```ts
const EXPLAIN_PHRASES = [
  "لم أفهم","لم افهم","ما فهمت","مو فاهم","غير واضح","ما وضحت",
  "اشرح أكثر","اشرح اكثر","اشرح","وضح","وضّح","وضح أكثر",
  "أعطني مثال","اعطني مثال","مثال","مثل ماذا",
  "حلها خطوة","خطوة بخطوة","الخطوات","كيف الحل","كيف نحل",
  "لماذا هذه","ليش هذي","لماذا الإجابة","ليش الجواب","علل","فسر","فسّر",
];
const ADMIN_BLOCK_KEYWORDS = [
  "قبول","تسجيل","رسوم","تأجيل","جدول","الجداول","لائحة","لوائح","قرار","فرع","فروع","رسوم"
];
function isExplainRequest(text: string): boolean {
  const t = (text || "").toLowerCase();
  return EXPLAIN_PHRASES.some(p => t.includes(p.toLowerCase()));
}
function hasAdminTopic(text: string): boolean {
  const t = (text || "").toLowerCase();
  return ADMIN_BLOCK_KEYWORDS.some(k => t.includes(k));
}
```

### ب. متغير `educationalExplain` (بجوار `let questionIntent` ~ السطر 790)
```ts
let educationalExplain = false;
```

### ج. تفعيله بعد تحديد `intent` (~ السطر 887)
```ts
const sessionExamFollowUp =
  isExplainRequest(lastUserMessage) &&
  !hasAdminTopic(lastUserMessage) &&
  inferIntentFromSession(lastUserMessage, priorMessages, "") === "exam_papers";
educationalExplain = sessionExamFollowUp;
if (educationalExplain) {
  // لا نُجبر فلترة exam-only كي نحتفظ بالمقاطع المرجعية، ولكن نمنع تسرب مواد إدارية
  console.log("[chat] EDU explain mode active for exam-paper follow-up");
}
```
- ملاحظة: إذا فُعِّل `educationalExplain` نتجاوز فرع `intent === "exam_papers"` الصارم ولا نُلغي الـ chunks (نسمح حتى لو لم تتطابق الفئة، لكن نحتفظ بالموجود من ملفات الامتحان كأولوية).

### د. تخفيف `strictBlock` وإضافة كتلة الشرح في `systemPrompt` (~ السطر 1180)
```ts
const eduBlock = educationalExplain ? `
🎓 **وضع الشرح التعليمي (مفعّل لهذه الرسالة فقط):**
- الطالب طلب توضيحاً لإجابة سابقة من «نماذج الامتحانات السابقة».
- مسموح باستخدام معرفتك العامة التعليمية لـ: تبسيط الفكرة، شرح المفهوم،
  إعطاء مثال مشابه، شرح خطوات الحل، توضيح سبب صحة الإجابة.
- يُمنع منعاً تاماً استخدام المعرفة العامة في: اللوائح الجامعية، القبول والتسجيل،
  الرسوم، التأجيل، الجداول، القرارات الرسمية، أو أي معلومة إدارية تخص الجامعة.
- ابدأ بسطر يقتبس النص الأصلي من النموذج (إن توفر) باستخدام \`>\`،
  ثم ضع عنواناً فرعياً \`### شرح تعليمي عام\` قبل التوضيح، لتمييز
  ما هو من المصدر عمّا هو شرح عام.
- في **آخر سطر** من ردك أضف الوسم: \`<!--EDU_EXPLAIN: 1-->\`
` : "";
```
- في حال `educationalExplain === true` نستبدل البند 2 من `strictBlock` بنص مرن: «ممنوع استخدام المعرفة العامة إلا للشرح التعليمي وفق قواعد وضع الشرح أدناه».
- ندمج `${eduBlock}` بعد `strictBlock` في قالب `systemPrompt`.

### هـ. التقاط الوسم وإرساله في meta (~ السطر 1388-1425)
- بعد `markerMatch = ... USED_SOURCES`:
  ```ts
  const eduMatch = fullContent.match(/<!--\s*EDU_EXPLAIN:\s*1\s*-->/i);
  const isEdu = !!eduMatch || educationalExplain;
  ```
- توسيع تنظيف المحتوى:
  ```ts
  const cleanContent = fullContent
    .replace(/<!--\s*USED_SOURCES:[\s\S]*?-->/gi, "")
    .replace(/<!--\s*EDU_EXPLAIN:[\s\S]*?-->/gi, "")
    .trimEnd();
  ```
- في كتلة meta:
  ```ts
  const metaPayload: any = {};
  if (settings.show_sources === "true" && finalSources.length > 0) {
    metaPayload.sources = finalSources.join("، ");
  }
  if (isEdu) metaPayload.educational_explain = true;
  if (Object.keys(metaPayload).length) {
    await writer.write(encoder.encode(`data: ${JSON.stringify({ meta: metaPayload })}\n\n`));
  }
  ```
- تعطيل `cache_enabled` لهذه الإجابة عند `isEdu` (لأن الشرح عام/سياقي).

---

## 2) `src/lib/chatApi.ts`
- توسيع التوقيع:
  ```ts
  onDone: (meta?: { sources?: string; cached?: boolean; educationalExplain?: boolean }) => void;
  ```
- التقاط `parsed?.meta?.educational_explain`:
  ```ts
  let metaEdu = false;
  if (parsed?.meta?.educational_explain) metaEdu = true;
  ...
  onDone({ sources: metaSources, educationalExplain: metaEdu });
  ```

---

## 3) `src/pages/Chat.tsx`
- إضافة حقل في `Message`:
  ```ts
  educationalExplain?: boolean;
  ```
- في `onDone` و`finalizeAssistant`، تمرير `meta?.educationalExplain` إلى الرسالة الجديدة.

---

## 4) `src/components/ChatMessage.tsx`
- تحت محتوى الرسالة وقبل سطر «المصدر»، عند `!isUser && message.educationalExplain`:
  ```tsx
  <div className="mt-2.5 px-3 py-2 rounded-lg text-xs flex items-center gap-1.5
                  bg-amber-500/10 text-amber-700 dark:text-amber-300
                  border border-amber-500/20" dir="rtl">
    <Info className="w-3.5 h-3.5 shrink-0" />
    <span>ملاحظة: الشرح التالي توضيح تعليمي عام، وليس معلومة رسمية من الجامعة.</span>
  </div>
  ```
- استيراد `Info` من `lucide-react`.

---

## معايير القبول
- بعد إجابة من ملف امتحان → "اشرح أكثر" / "لم أفهم" → تظهر رسالة شرح تعليمي + بانر التنبيه + اقتباس النص الأصلي.
- "اشرح" بعد سؤال عن القبول/الرسوم → لا تظهر رسالة الشرح التعليمي (لا يُفعَّل `educationalExplain`).
- لا تأثير على أسئلة عادية بدون سياق امتحان.
- لا migration مطلوب.