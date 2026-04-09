

# إصلاح مشكلة عدم ظهور المعاينة

## السبب الجذري
خطأ في Console: `RefreshRuntime.getRefreshReg is not a function`

الإصدار المثبت من `@vitejs/plugin-react-swc` هو **4.3.0** وهو متوافق مع **Vite 5 فقط**. المشروع يستخدم **Vite 6.4.2**، مما يسبب فشل React Fast Refresh وتوقف التطبيق بالكامل عن العرض.

## الحل
تحديث `@vitejs/plugin-react-swc` إلى إصدار متوافق مع Vite 6:

### ملف `package.json`
- تغيير `"@vitejs/plugin-react-swc": "^4.3.0"` إلى `"@vitejs/plugin-react-swc": "^4.4.0"`
- ثم تشغيل `bun install` لتحديث الحزمة

هذا تعديل سطر واحد فقط. لا حاجة لتغيير أي ملف آخر.

