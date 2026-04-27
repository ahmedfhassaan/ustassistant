# تحسين تحمّل الأخطاء الإملائية في أسئلة الطلاب (Arabic Typo Normalization)

## الهدف
قبل إجراء البحث في قاعدة المعرفة، يتم تطبيع السؤال العربي وتصحيح الأخطاء الإملائية الشائعة، ودمج المصطلحات الجامعية. ثم تُجرَّب عدة صيغ من السؤال (الأصلي + المُطبَّع + المُعاد صياغته) ويُختار البحث صاحب أعلى rank — بدون تغيير معنى السؤال أو إدخال هلوسة.

## التغييرات

### 1) ملف جديد: `supabase/functions/_shared/arabic-normalize.ts`
وحدة مشتركة تحتوي:

- **`normalizeArabic(text)`**: تطبيع نصي صارم وآمن (لا يغيّر المعنى):
  - إزالة التشكيل (الفتحة، الضمة، الكسرة، الشدة، السكون، التنوين).
  - توحيد الهمزات: `أ إ آ ٱ` → `ا`
  - `ى` → `ي` ، `ة` → `ه` ، `ؤ` → `و` ، `ئ` → `ي`
  - إزالة التطويل `ـ` والمسافات الزائدة.
  - إزالة الرموز غير الضرورية مع الإبقاء على الأرقام.

- **`UNIVERSITY_TERMS`**: قاموس مصطلحات جامعية مع متغيراتها (typo variants):
  ```
  الحرمان: ["الحرمان", "الجرمان", "الجومان", "الحرمن", "حرمان"]
  التسجيل: ["التسجيل", "تسجيل", "التسجل"]
  الانسحاب: ["الانسحاب", "انسحاب", "الانسحب"]
  الحذف: ["الحذف", "حذف"]
  الإضافة: ["الاضافه", "اضافه", "الاضافة"]
  المعدل: ["المعدل", "معدل", "المعدل التراكمي", "GPA"]
  الرسوم: ["الرسوم", "الرسم", "رسوم", "رسم"]
  الاختبارات: ["الاختبارات", "اختبارات", "الامتحانات", "الامتحان"]
  الغياب: ["الغياب", "غياب", "غياب الطالب"]
  القبول: ["القبول", "قبول", "التقديم"]
  ```

- **`fuzzyCorrect(text)`**: يبحث عن كلمات قريبة من القاموس باستخدام Levenshtein distance ≤ 2 على النسخة المطبّعة. يستبدل الكلمة بالمصطلح الرسمي **فقط** إذا:
  - طول الكلمة ≥ 4 أحرف (تجنب التصحيحات العشوائية على كلمات قصيرة).
  - مسافة Levenshtein ≤ 2 على النسخة المطبّعة.
  - يُرجع `{ corrected: string, confidence: "high"|"low"|"none", changedWords: string[] }`.

- **`generateQueryVariants(question)`**: يُرجع مصفوفة فريدة من صيغ البحث:
  ```
  [
    original,                  // كما كتبه الطالب
    normalizeArabic(original), // مطبّع فقط
    fuzzyCorrect(...).corrected // مصحّح بالقاموس (إذا اختلف)
  ]
  ```
  مع إزالة التكرار.

### 2) `supabase/functions/chat/index.ts`
استيراد الوحدة الجديدة، وفي قسم البحث (حوالي السطر 332-365):

- إنشاء قائمة الصيغ:
  ```ts
  const variants = generateQueryVariants(lastUserMessage);
  // إذا rewrite مفعّل، أضف rewrittenQuery أيضاً
  if (enableRewrite && rewrittenQuery && !variants.includes(rewrittenQuery)) {
    variants.push(rewrittenQuery);
  }
  ```

- بدل تنفيذ بحث واحد + retry، نُنفّذ البحث على كل الصيغ بالتوازي عبر `Promise.all`، ونختار النتيجة ذات أعلى `rank` في أول صف:
  ```ts
  const results = await Promise.all(variants.map(v =>
    supabase.rpc("search_knowledge_hybrid", { ...rpcParams, query_text: v })
  ));
  // اختيار أفضل مجموعة
  let best = { variant: variants[0], chunks: [], topRank: 0 };
  results.forEach((r, i) => {
    const top = r.data?.[0]?.rank ?? 0;
    if (top > best.topRank) best = { variant: variants[i], chunks: r.data, topRank: top };
  });
  ```

- التسجيل (logging) خلف العلم `DEBUG_RAG=true` الموجود مسبقاً:
  ```
  [chat] variants: original | normalized | corrected | rewritten
  [chat] best variant: "..." topRank=0.42
  ```

- استخدام `best.variant` في `question_hash` للكاش يبقى كما هو (نُبقي hash على النص الأصلي حتى لا تتلوث طبقة الكاش).

### 3) عدم تغيير المعنى
- التصحيح يُطبّق فقط إذا تطابقت كلمة في القاموس بمسافة ≤ 2.
- لا يتم استبدال كلمات لم تُطابق القاموس (لا "تخمين" حر).
- الصيغة الأصلية تبقى ضمن الصيغ المُجرَّبة دائماً، فإذا كانت الأصلية أفضل ستُختار تلقائياً.
- لا يُغيَّر السؤال المعروض للطالب أو المُمرَّر لـ Gemini، فقط نص البحث الداخلي.

## ما لن يتغيّر
- جدول `assistant_settings` وقاعدة البيانات.
- منطق الكاش (exact + semantic).
- منطق reranking وحساب confidence.
- واجهة المحادثة وتدفق العرض.

## ملفات سيتم لمسها
- جديد: `supabase/functions/_shared/arabic-normalize.ts`
- تعديل: `supabase/functions/chat/index.ts` (استيراد + استبدال قسم البحث الواحد بحلقة multi-variant)
