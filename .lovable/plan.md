# تصنيف نية السؤال لتوجيه البحث

## الهدف
استبدال الفحص البولياني المبسّط `isAdmissionOrCurriculumQuestion` بمصنّف موحّد يُرجِع نوعًا صريحًا للسؤال، يستخدمه نظام RAG لتقرير:
- متى يتم استبعاد ملفات مشاريع التخرج.
- متى يُسمح صراحةً بمشاريع التخرج (سؤال صريح عنها).
- متى لا ينطبق الفلتر إطلاقًا.

## التغييرات في `supabase/functions/chat/index.ts`

### 1) إضافة نوع وتعداد للنية
```ts
type QuestionIntent =
  | "admission"      // قبول والتحاق
  | "registration"   // تسجيل مقررات / حذف وإضافة / مواعيد
  | "curriculum"     // خطط دراسية ومقررات وتخصصات
  | "graduation_projects" // سؤال صريح عن مشاريع التخرج
  | "other";
```

### 2) دالة `classifyIntent(text): QuestionIntent`
تستخدم قوائم كلمات مفتاحية منفصلة لكل فئة، مع ترتيب أولوية:
1. `graduation_projects` أولًا (لمنع الاستبعاد عند السؤال الصريح): مشاريع التخرج، مشروع تخرج، مشاريع سابقة، أمثلة مشاريع، graduation project.
2. `admission`: قبول، التحاق، تقديم، شروط القبول، أوراق القبول، رسوم القبول، نسبة القبول، كيف أقدم/أقدّم، التسجيل بالجامعة (دلالة قبول).
3. `registration`: تسجيل المقررات، حذف وإضافة، سحب مادة، فتح التسجيل، مواعيد التسجيل، الفصل القادم، جدول التسجيل.
4. `curriculum`: خطة دراسية، الخطة الدراسية، مقرر/مقررات، مادة/مواد، ساعات معتمدة، تخصص، رمز/كود مادة، متطلبات التخرج، البرنامج الدراسي.
5) `other` افتراضيًا.

### 3) منطق الاستبعاد في بناء chunks (سطر 547–559)
بدلاً من `isAdmissionOrCurriculumQuestion`:
```ts
const intent = classifyIntent(lastUserMessage);
const shouldExcludeProjects =
  intent === "admission" || intent === "registration" || intent === "curriculum";

if (shouldExcludeProjects) {
  const filtered = (chunks as any[]).filter(c => !isGraduationProjectDoc(c.document_name));
  if (filtered.length > 0) {
    chunks = filtered;
    console.log(`[chat] intent=${intent}: filtered ${before - filtered.length} project chunks, kept ${filtered.length}`);
  } else {
    chunks = null;
    console.log(`[chat] intent=${intent}: all chunks were projects → trigger live search`);
  }
} else if (intent === "graduation_projects") {
  console.log(`[chat] intent=graduation_projects: keeping project chunks as-is`);
}
```

### 4) دمج `classifyQuestion` القديمة (للـ analytics) مع المصنّف الجديد
- `classifyQuestion` تبقى للتحليلات (تحتوي فئات أوسع: مالي/إداري/خدمات…) لأن تغييرها يكسر الإحصاءات.
- نضيف عمودًا للوغ فقط: `intent` بجانب `category` لتسهيل التتبّع.
- لا تعديل على إشارات قاعدة البيانات.

### 5) لوغ تشخيصي موحّد عند بداية المعالجة
سطر واحد:
```
[chat] question intent=<intent> category=<category> excludeProjects=<bool>
```

## ملفات سيتم تعديلها
- `supabase/functions/chat/index.ts` فقط.

## نشر
- إعادة نشر دالة `chat` بعد التعديل.

## نتائج متوقعة
| السؤال | intent | استبعاد المشاريع |
|---|---|---|
| ما شروط القبول؟ | admission | نعم |
| متى يفتح تسجيل المقررات؟ | registration | نعم |
| ما مقررات تقنية المعلومات؟ | curriculum | نعم |
| اذكر مشاريع التخرج السابقة | graduation_projects | لا |
| هل يوجد نظام ERP بالجامعة؟ | other | لا (يعمل Live Search عند الحاجة) |

## ذاكرة
تحديث `mem://features/graduation-projects-integration` لتعكس وجود مصنّف نية موحّد بدلاً من الفحص البولياني.
