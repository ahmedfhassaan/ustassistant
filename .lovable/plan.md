## المشكلة
عند تصدير PDF تظهر صفحة فارغة قبل (أو بين) صفحات المحتوى في معاينة الطباعة.

## السبب
في `src/lib/exporters/toPdf.ts` عدّة عوامل تتسبّب بإدراج صفحة فارغة عند الطباعة في Chrome:

1. `table { overflow: hidden; border-radius: 8px; box-shadow: ... }` — استخدام `overflow: hidden` على عناصر تمتد عبر صفحات يجعل Chrome يحجز صفحة كاملة فارغة قبل الجدول.
2. `h2 { display: flex }` متبوعًا مباشرة بـ `<table>` بدون `page-break-inside`/`break-inside` صريح، فيحدث فاصل صفحة قبل الجدول إذا لم يعد الترويسة مع أول صف.
3. `.header` فيه `box-shadow` و`border-radius` أيضًا — نفس مشكلة Chrome للعناصر التي تتجاوز ارتفاع الصفحة.
4. الـ `.footer` بعد الجدول قد ينزلق لصفحة جديدة فارغة لأن `margin-top: 28px` + `border-top` يدفعها للأسفل.

## الحل
تعديل الأنماط في `buildHtml` داخل `src/lib/exporters/toPdf.ts` فقط (لا تغييرات أخرى):

1. **إزالة `overflow: hidden` من `table` والاعتماد على `border-collapse: collapse`** بدل `separate`، مع إبقاء الحواف الملوّنة على `th`/`td` فقط. هذا يحلّ السبب الرئيسي.
2. إضافة `break-inside: auto` للجدول و `break-inside: avoid` للصفوف فقط (موجود) + `break-after: avoid` على `h2` كي يلتصق العنوان بأول صف بدل أن يقفز لصفحة جديدة.
3. تغليف كل قسم (`<section class="block">`) مع `break-inside: auto` ومنع هوامش زائدة في آخر قسم: `section:last-child table { margin-bottom: 0 }` و `.footer { break-before: avoid }`.
4. إزالة `box-shadow` داخل `@media print` (الظلال تتسبّب أحيانًا بصفحات إضافية في Chrome) وتعطيلها فقط أثناء الطباعة، مع إبقاء التصميم على الشاشة.
5. التأكد من أن `body` لا يحوي `padding`/`margin` إضافيًا، وأن آخر عنصر (`.footer`) ليس له `margin-bottom` يدفع لصفحة جديدة.

### كود التغيير المختصر
- `table`: حذف `overflow: hidden` و `box-shadow`، استبدال `border-collapse: separate; border-spacing: 0` بـ `border-collapse: collapse`.
- `.header`: داخل `@media print` → `box-shadow: none; background: #5BB5EC; color: #fff;` (لون مسطّح أوضح للطباعة).
- إضافة:
  ```css
  h2 { break-after: avoid; page-break-after: avoid; }
  table { break-inside: auto; }
  .footer { break-before: avoid; page-break-before: avoid; }
  @media print {
    .header, table { box-shadow: none !important; }
  }
  ```

## القبول
- معاينة الطباعة تبدأ مباشرة بصفحة الترويسة، لا صفحة بيضاء قبلها.
- لا توجد صفحة فارغة بين الأقسام أو قبل الـ footer.
- المظهر على الشاشة (نافذة المعاينة) لم يتغيّر.