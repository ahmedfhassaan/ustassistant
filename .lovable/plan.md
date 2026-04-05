

# إصلاح تأخر التبديل بين الوضع الداكن والفاتح

## المشكلة
عند التبديل بين الوضعين، بعض العناصر (خاصة التي تستخدم تأثيرات زجاجية) تتأخر في تغيير مظهرها. السبب هو استخدام `transition-all` مع `backdrop-filter` — المتصفح يحاول تحريك تأثير الضبابية تدريجياً وهو مكلف في الأداء.

## الحل
استبدال `transition-all` بخصائص محددة (`transition-colors` أو `transition-shadow`) في العناصر المتأثرة، مع إضافة `transition: none` لخصائص `backdrop-filter` في فئات الزجاج.

### التعديلات

**1. `src/index.css`** — إضافة `transition: background-color 0.3s, border-color 0.3s, color 0.3s` لفئات `.glass-*` بدلاً من ترك `backdrop-filter` يتحرك تدريجياً.

**2. `src/components/ChatHeader.tsx`** — تغيير `transition-all duration-300` إلى `transition-colors duration-300`.

**3. `src/components/ChatSidebar.tsx`** — نفس التغيير.

**4. `src/components/ChatInput.tsx`** — نفس التغيير للحاوية الرئيسية.

**5. `src/pages/Login.tsx`** — تغيير `transition-all duration-300` في مربع تسجيل الدخول إلى `transition-colors duration-300`.

**6. `src/pages/AdminStudents.tsx`** — نفس التغيير للبطاقات والصفوف.

### التفاصيل التقنية
- `transition-all` يشمل `backdrop-filter` و `background` و `box-shadow` وكل الخصائص — المتصفح يعيد حساب الضبابية كل إطار
- `transition-colors` ينقل فقط الألوان (background-color, color, border-color) وهو أخف بكثير
- العناصر التي تحتاج `transition` لتأثيرات hover (مثل shadow) ستستخدم `transition: color 0.3s, background-color 0.3s, box-shadow 0.3s` محدداً

