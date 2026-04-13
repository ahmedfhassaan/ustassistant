

# إزالة ذكر كلمة Lovable من الكود

## التغييرات المطلوبة

### 1. `index.html`
- تغيير `<meta name="author" content="Lovable" />` إلى اسم مناسب مثل `"UST Assistant"`
- تغيير `<meta name="twitter:site" content="@Lovable" />` إلى قيمة مناسبة أو إزالته

### 2. `README.md`
- تغيير العنوان من `Welcome to your Lovable project` إلى `UST Assistant`

### 3. `src/pages/Index.tsx`
- إزالة سطر الـ placeholder الذي يحتوي على `data-lovable-blank-page-placeholder`

> ملاحظة: مكتبة `lovable-tagger` في `package.json` هي أداة بناء داخلية ولا تظهر للمستخدمين النهائيين.

## الملفات المتأثرة
- `index.html`
- `README.md`
- `src/pages/Index.tsx`

