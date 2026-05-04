
# خطة: صفحة توثيق Smart University Assistant

## الملفات الجديدة

### 1) `src/pages/Documentation.tsx`
صفحة كاملة RTL، عربية، Responsive، تحتوي:

- **هيرو علوي**: بطاقة كبيرة بخلفية متدرجة (gradient) باستخدام نفس tokens المشروع (`primary`, `--background`, glassmorphism)، تحوي:
  - أيقونة/شعار الجامعة في أعلى اليسار.
  - عنوان رئيسي: "وثيقة نظام Smart University Assistant".
  - وصف مختصر تحت العنوان.
  - شارات `Badge` صغيرة: `RTL` · `عربي` · `RAG` · `Gemini` · `Supabase` · `React + Vite`.
  - شريط معلومات سفلي (داخل الهيرو) من 5 خانات: اسم النظام / إصدار الوثيقة (1.0) / نوع النظام (مساعد ذكي للطلاب) / التقنية (RAG + Gemini) / الهدف (دعم الطلاب بدقة).

- **بطاقة فهرس المحتويات**: شبكة من 12 صف، كل صف فيه رقم عربي داخل مربع صغير + نص العنوان، روابط Anchor `#section-N` للتنقل السلس.

- **12 قسم** كبطاقات `Card` مستقلة (id لكل قسم)، كل قسم يحوي:
  - رأس بأيقونة من `lucide-react` + رقم + عنوان + سطر فرعي.
  - محتوى منوع: فقرات، عناوين فرعية، قوائم نقطية برموز ✅ ⚠️، بطاقات معلومات صغيرة، جدول واحد على الأقل عند الحاجة، تنبيهات بلون `accent` أو `destructive/10`.

  الأقسام:
  1. نظرة عامة على النظام
  2. واجهة الدردشة
  3. نظام RAG
  4. قاعدة المعرفة
  5. رفع الملفات
  6. عرض المصادر
  7. لوحة المشرف
  8. تسجيل الدخول والصلاحيات
  9. الأمان والخصوصية
  10. الأداء والتوسّع
  11. حدود النظام
  12. ملاحظات المطورين

- **Header علوي مبسط**: شعار + اسم النظام + زر تبديل الثيم + زر "العودة" يرجع للخلف (`navigate(-1)`)، مستوحى من `ChatHeader` لكن بدون منطق طالب/خروج.

- **Footer**: نص خفيف "Smart University Assistant — وثيقة الإصدار 1.0".

المحتوى مكتوب خصيصاً للمشروع (طلاب، RAG، قاعدة معرفة رسمية، عدم الإجابة من المعرفة العامة، عرض المصادر، تحديث المشرف، الدقة والأمان).

## الملفات المُعدّلة

### `src/App.tsx`
إضافة سطرين فقط:
- `import Documentation from "./pages/Documentation";`
- مسارين قبل `*`:
  - `<Route path="/documentation" element={<Documentation />} />`
  - `<Route path="/docs" element={<Documentation />} />`

لا تغيير على بقية المسارات.

### `src/components/ChatHeader.tsx`
إضافة زر/رابط "التوثيق" بجانب أزرار الثيم/الخروج (يستخدم `Link` من `react-router-dom` مع `Button variant="ghost"` وأيقونة `BookOpen`). مرئي على الديسكتوب، مخفي على الموبايل لتوفير المساحة (يمكن وضعه أيضاً داخل `ChatSidebar` لاحقاً).

> ملاحظة: Navbar الفعلي للتطبيق هو `ChatHeader` داخل صفحة `/chat`؛ صفحة `Login` لا تحوي navbar. لذلك نضع الرابط هناك. صفحة التوثيق نفسها متاحة عبر URL مباشر بلا حاجة لتسجيل دخول.

## لماذا هذه الملفات تحديداً

- **صفحة جديدة** = ملف جديد في `src/pages/` (وفق `PROJECT_STRUCTURE.md`).
- **التسجيل في الراوتر** يتم في `src/App.tsx` فقط (نقطة تركيب وحيدة).
- **رابط التوثيق** يضاف إلى `ChatHeader` لأنه الـ navbar الوحيد المرئي للمستخدم بعد الدخول. لا حاجة لإنشاء navbar جديد.
- **لا ملفات منطق/خدمات**: الصفحة عرض ثابت فقط — لا استدعاءات Supabase ولا hooks خاصة. (يلتزم بـ "UI خالٍ من business logic").

## إعادة استخدام مكونات موجودة

- `@/components/ui/card` (Card, CardHeader, CardTitle, CardContent)
- `@/components/ui/badge`
- `@/components/ui/button`
- `@/components/ui/separator`
- `@/components/ui/table` للجداول
- `@/hooks/use-theme` لتبديل الثيم
- أيقونات `lucide-react` (موجودة)
- شعار `@/assets/university-logo.png` و `university-logo-dark.jpeg`
- design tokens من `index.css` (primary, background, foreground, muted, glassmorphism)

## التزام القواعد

- ✅ Feature-first: الصفحة في `pages/` بدون منطق، لا تستورد من ميزات أخرى.
- ✅ لا تعديل على `integrations/supabase/*` ولا `.env` ولا `config.toml`.
- ✅ لا منطق RAG/Supabase في الواجهة.
- ✅ Tailwind tokens فقط، لا ألوان مباشرة.
- ✅ RTL مدعوم أصلاً في المشروع (Tajawal + dir).
- ✅ لا ملفات مكررة، لا نسخ `*v2` من صفحات موجودة.
- ⚠️ ملاحظة: المشروع يستخدم `BrowserRouter` مع SPA fallback عبر `public/_redirects` (Cloudflare Pages) — مساري `/documentation` و `/docs` سيعملان مباشرة بدون أي إعداد إضافي.

## المخاطر

- بسيطة جداً: إضافة مسارات وصفحة عرض فقط.
- خطر طفيف: ازدحام `ChatHeader` على شاشات صغيرة → محلول بإخفاء نص الرابط `<span class="hidden md:inline">` مع إبقاء الأيقونة.
- لا تأثير على الكاش، RAG، DB، أو Edge Functions.

## الرجوع عن التعديل

1. حذف ملف `src/pages/Documentation.tsx`.
2. حذف السطرين من `src/App.tsx` (الاستيراد + المسارين).
3. إزالة زر "التوثيق" من `ChatHeader.tsx`.

لا migrations، لا redeploy لأي edge function، الرجوع فوري وآمن.

## نتيجة المستخدم

- زيارة `/documentation` أو `/docs` → صفحة وثيقة منظمة بأسلوب احترافي مشابه للنموذج المرجعي، بمحتوى خاص بـ Smart University Assistant.
- زر "التوثيق" مرئي في شريط الشات.
- تجربة موحّدة مع باقي التطبيق (نفس الثيم، الخط، الألوان، الـ RTL).

في انتظار موافقتك للتنفيذ.
