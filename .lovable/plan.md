

# إصلاح لون مربع الرقم الجامعي عند الترشيح (Autocomplete)

## المشكلة
عند اختيار قيمة من قائمة الترشيح التلقائي للمتصفح (autocomplete/autofill)، يتحول مربع الإدخال إلى لون أبيض مائل للأزرق. هذا سلوك افتراضي من المتصفح (Chrome/Edge) الذي يطبق خلفية خاصة على الحقول المعبأة تلقائياً.

## الحل
إضافة CSS في `src/index.css` لتجاوز تنسيق الـ autofill الافتراضي للمتصفح:

### تعديل `src/index.css`
إضافة قواعد CSS لتجاوز `-webkit-autofill` في كلا الوضعين (فاتح وداكن):

```css
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px hsl(var(--background)) inset !important;
  -webkit-text-fill-color: hsl(var(--foreground)) !important;
  transition: background-color 5000s ease-in-out 0s;
}

.dark input:-webkit-autofill,
.dark input:-webkit-autofill:hover,
.dark input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px hsl(222 40% 14%) inset !important;
  -webkit-text-fill-color: hsl(var(--foreground)) !important;
}
```

كما يمكن إضافة `autoComplete="off"` على حقل الرقم الجامعي في `Login.tsx` لمنع الترشيح التلقائي إذا كان غير مرغوب.

