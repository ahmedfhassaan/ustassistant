# خطة تحسين التجاوب في الجوال

## المشاكل المكتشفة

بعد فحص جميع الصفحات والمكونات، رصدتُ عدة مشاكل تجاوب على شاشات الجوال (≤640px) وعلى الأجهزة اللوحية (641–1023px):

### 1. لوحة التحكم — صفحة قاعدة المعرفة (`AdminKnowledge.tsx`)
- ترويسة البطاقة `flex flex-row items-center justify-between` تحتوي 3 أزرار طويلة بالعربية ("إعادة معالجة الكل"، "إعادة توليد Embeddings"، "رفع مستند") + العنوان. على الجوال تنفجر الترويسة وتسبب تجاوزاً أفقياً.
- معلومات الملف (النوع، الحجم، الحالة، التاريخ مفصولة بـ `·`) تُعرض كصف واحد طويل قد يقطع التصميم.

### 2. صفحة إدارة الطلاب (`AdminStudents.tsx`)
- ترويسة البطاقة `flex flex-row items-center justify-between` ثابتة الاتجاه (لا تنكسر) — زر "إضافة طالب" والعنوان قد يتداخلان على الشاشات الصغيرة جداً.

### 3. صفحة الإعدادات (`AdminSettings.tsx`)
- `TabsList` مُعرَّف `grid-cols-6` — 6 تبويبات في صف واحد على الجوال تجعل النص شديد الازدحام مع إخفاء الأيقونات `hidden sm:block`.
- ترويسة الصفحة `flex items-center justify-between` بين العنوان وزر "حفظ" تحتاج التفاف مرن.
- Sliders داخل tab RAG تعمل لكن بعض الـ Labels طويلة تتجاوز.

### 4. صفحة التقييمات (`AdminFeedback.tsx`)
- `CardHeader` يستخدم `flex-row` ثابت بين العنوان و Select Filter (عرض ثابت `w-48`) — سيتداخلان على الجوال.

### 5. صفحة لوحة المعلومات (`AdminDashboard.tsx`)
- البطاقات الإحصائية `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5` — على الأجهزة المتوسطة (≥640 و<1024) تظهر عمودين فقط مع 5 بطاقات → آخر بطاقة وحيدة. اعتبار: استخدام `md:grid-cols-3 lg:grid-cols-5`.

### 6. ترويسة الدردشة (`ChatHeader.tsx`)
- اسم المساعد + شعار + اسم الطالب + 3 أزرار قد تتزاحم على شاشات أقل من 380px.
- اسم الطالب الكامل بدون `truncate` قد يدفع الأزرار خارج الإطار.

### 7. شاشة الترحيب (`ChatWelcome.tsx`)
- جيدة عموماً. بطاقات الاقتراح `grid-cols-1 sm:grid-cols-2` صحيحة.

### 8. صفحة تسجيل الدخول (`Login.tsx`)
- البطاقة `p-8` على شاشة 320px قد تكون ضيقة. مقبولة.

### 9. شريط جانبي للدردشة (`ChatSidebar.tsx`)
- العرض ثابت `w-72` (288px). على شاشة 320px يكاد يملأها بالكامل — مقبول مع وجود overlay، لكن يفضّل `w-[85vw] max-w-72`.

### 10. شريط جانبي إداري (`AdminLayout.tsx`)
- العرض `w-64` ثابت — مقبول. الـ breakpoint `lg:` (1024px) يعني أن الشاشة الحالية 939px تستخدم الجوال layout — هذا صحيح.

---

## الخطة التنفيذية

سأطبّق التعديلات التالية مع الحفاظ التام على الواجهة والوظائف:

### `src/pages/AdminKnowledge.tsx`
- تحويل ترويسة البطاقة إلى `flex-col sm:flex-row` مع `gap-3` + `flex-wrap` للأزرار، وجعل الأزرار بـ `flex-1 sm:flex-none` على الجوال.
- في صف معلومات الملف: استبدال الفواصل `·` بـ `flex-wrap gap-x-2 gap-y-1`.

### `src/pages/AdminStudents.tsx`
- ترويسة البطاقة: `flex-col sm:flex-row gap-3 items-stretch sm:items-center`.
- Diagonal modals جيدة بـ `max-w-md`.

### `src/pages/AdminSettings.tsx`
- `TabsList`: `grid grid-cols-3 sm:grid-cols-6` (سطرين على الجوال).
- إظهار الأيقونات في الجوال (إزالة `hidden sm:block`) مع تصغير النص لـ `text-[11px]`.
- ترويسة الصفحة: `flex-col sm:flex-row gap-3` بين العنوان وزر الحفظ.

### `src/pages/AdminFeedback.tsx`
- ترويسة البطاقة: `flex-col sm:flex-row gap-3` + Select بعرض `w-full sm:w-48`.

### `src/pages/AdminDashboard.tsx`
- شبكة الإحصائيات: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5`.
- تصغير `p-6` إلى `p-4 sm:p-6` لتقليل الازدحام.

### `src/components/ChatHeader.tsx`
- إخفاء اسم الطالب على الجوال جداً (`hidden xs:inline` أو `hidden sm:inline`).
- إضافة `truncate max-w-[120px]` لاسم الطالب.
- تصغير المسافات بين الأزرار.

### `src/components/ChatSidebar.tsx`
- تغيير `w-72` إلى `w-[85vw] max-w-72` فقط في mobile state.

### `src/pages/AdminFAQ.tsx`
- مراجعة وتطبيق نفس نمط ترويسة `flex-col sm:flex-row` إذا كان لازماً.

---

## ضمانات
- لا تغييرات في المنطق أو حالة التطبيق.
- لا تغييرات في قاعدة البيانات أو Edge Functions.
- جميع الـ breakpoints موجودة أصلاً في Tailwind (`sm`, `md`, `lg`).
- بعد التنفيذ: التحقق بصرياً عبر `browser--set_viewport_size` عند 375px و 768px للتأكد.

## الملفات التي ستُعدَّل
1. `src/pages/AdminKnowledge.tsx`
2. `src/pages/AdminStudents.tsx`
3. `src/pages/AdminSettings.tsx`
4. `src/pages/AdminFeedback.tsx`
5. `src/pages/AdminDashboard.tsx`
6. `src/pages/AdminFAQ.tsx`
7. `src/components/ChatHeader.tsx`
8. `src/components/ChatSidebar.tsx`
