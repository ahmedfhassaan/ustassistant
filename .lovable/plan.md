
# إبراز بطاقات التوثيق بنفس قوة بطاقة تسجيل الدخول

بطاقات صفحة التوثيق حالياً تستخدم `Card` الافتراضي بظل خفيف جداً (`shadow-sm`)، بينما بطاقة تسجيل الدخول مُبرَزة بظل قوي وحلقة (ring) ولمسة توهج في الوضع الداكن. الهدف: تطبيق نفس مستوى الإبراز على بطاقات التوثيق لتشعر بنفس الثقل البصري.

## الأسلوب المرجعي من `Login.tsx`
- **Light**: `bg-background border border-border/40 ring-1 ring-primary/5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] rounded-3xl`
- **Dark**: `bg-[hsl(222_40%_14%)] border border-primary/25 shadow-[0_0_40px_rgba(112,200,255,0.08),0_20px_60px_rgba(0,0,0,0.4)] ring-1 ring-white/5 rounded-3xl`

## الملف المُعدَّل (1 فقط)
**`src/pages/Documentation.tsx`**

## التعديلات

### 1. تعريف ثابت موحَّد في رأس المكوّن
داخل `Documentation()`، إضافة سطرين بعد `useTheme`:
```ts
const cardElevated = isDark
  ? "bg-[hsl(222_40%_14%)] border-primary/25 shadow-[0_0_40px_rgba(112,200,255,0.08),0_20px_60px_rgba(0,0,0,0.4)] ring-1 ring-white/5 rounded-3xl"
  : "bg-background border-border/40 ring-1 ring-primary/5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] rounded-3xl";
```

### 2. تطبيقه على كل `<Card>`
تمرير `className={cardElevated}` لكل البطاقات الـ13 (فهرس المحتويات + 12 قسماً):
- `<Card>` فهرس المحتويات
- `<Card id="overview">` ... حتى `<Card id="developers">`

`Card` من shadcn يدمج className تلقائياً عبر `cn()`، فالـ `rounded-3xl` و `shadow-*` ستحلّ محل القيم الافتراضية.

### 3. الهيرو
الهيرو حالياً `<section>` (ليس `Card`) ويملك بالفعل تدرّجاً وحدوداً. لإبقاء التراتب البصري سليماً (الهيرو > البطاقات)، نُبقيه كما هو دون تغيير.

## ما لن يتغيّر
- بنية المحتوى، النصوص، الجداول، MiniCards، Notices.
- `index.css` و design tokens.
- صفحة تسجيل الدخول نفسها.
- مكوّنات `MiniCard` الداخلية (تبقى ثانوية بصرياً).

## المبرّر
- توحيد نفس "بصمة الإبراز" يخلق هوية بصرية متّسقة بين الصفحات الرئيسية للتطبيق.
- الانتقال من `shadow-sm` إلى ظل عميق + ring يُبرز كل قسم كوحدة مستقلة قابلة للقراءة.
- `rounded-3xl` يتماشى مع ذاكرة `Admin UI Cards` (16px radius، soft shadows).

## المخاطر
- ظل بحجم `60px` على ١٣ بطاقة قد يبدو ثقيلاً في صفحة طويلة. التخفيف: لو ظهر مفرطاً، يمكن لاحقاً تخفيف القيمة من `0.08` → `0.06`.
- الصفحة طويلة جداً، لكن الظلال CSS-only لا تؤثر على الأداء.

## الرجوع
حذف الثابت `cardElevated` وإزالة `className={cardElevated}` من البطاقات.
