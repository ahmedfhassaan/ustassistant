

# إضافة زر إظهار/إخفاء كلمة المرور

## التغيير
إضافة أيقونة عين (Eye/EyeOff) داخل حقل كلمة المرور في صفحة تسجيل الدخول، للتبديل بين إظهار وإخفاء النص.

## التنفيذ

### ملف واحد: `src/pages/Login.tsx`
1. إضافة `Eye` و `EyeOff` من lucide-react إلى الاستيرادات
2. إضافة state جديد: `showPassword` (boolean)
3. تغليف حقل الإدخال بـ `div` ذو `position: relative`
4. تغيير `type` الحقل من `"password"` الثابت إلى `showPassword ? "text" : "password"`
5. إضافة زر أيقونة داخل الـ div (يسار الحقل) يبدّل بين `Eye` و `EyeOff`

