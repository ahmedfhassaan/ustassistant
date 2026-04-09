
الهدف: تحويل المشروع إلى إعداد React + Vite قياسي، clean وقابل للنشر على Cloudflare Pages بشكل مستقر، مع إزالة سبب فشل النشر الحالي من الجذور.

1) التشخيص
- الفشل الأول كان بسبب Vite 5، وهذا تم تجاوزه بعد رفعه إلى Vite 6.
- الفشل الحالي سببه الجذري مزدوج:
  - النشر يتم عبر `npx wrangler deploy` (مسار Workers auto-configuration) بينما التطبيق الحالي frontend-only ويصلح كـ static site على Cloudflare Pages.
  - `vite.config.ts` ما زال بصيغة ديناميكية `defineConfig(({ mode }) => ...)` مع `@vitejs/plugin-react-swc` و plugin إضافي dev-only، وهذا جعل Wrangler يفشل في التعرف على `plugins array` وتعديلها آلياً.
- يوجد أيضاً نقص مهم لبيئة Pages: لا يوجد إعداد Pages صريح داخل المشروع، ولا ملف SPA fallback لروابط `BrowserRouter`.

2) ما سأعدله داخل المشروع
- `package.json`
  - استبدال `@vitejs/plugin-react-swc` بـ `@vitejs/plugin-react`.
  - إضافة `wrangler` كـ `devDependency`.
  - إضافة scripts واضحة وثابتة:
    - `build`
    - `preview`
    - `cf:build`
    - `cf:deploy` = `wrangler pages deploy dist`
  - إزالة أي اعتماد غير لازم لمسار Workers auto-setup.
- `vite.config.ts`
  - تحويله إلى `defineConfig({ ... })` ثابت بدل callback ديناميكي.
  - جعل `plugins: [react()]` مصفوفة literal واضحة وصالحة.
  - الإبقاء على `alias` و `define` و `server` فقط بصيغة قياسية مستقرة.
  - إزالة أي تعقيد يربك Cloudflare auto-detection.
- `vitest.config.ts`
  - توحيد plugin إلى `@vitejs/plugin-react` حتى تبقى بيئة الاختبار متسقة مع Vite.
- `wrangler.jsonc`
  - إضافة إعداد Pages صريح مع `pages_build_output_dir: "dist"` و `compatibility_date`.
- `public/_redirects`
  - إضافة:
    `/* /index.html 200`
  لضمان عمل deep links و refresh مع React Router على Cloudflare Pages.
- تنظيف readiness
  - إزالة تعليقات/placeholder/TODO الواضحة المرتبطة بالإعدادات، مثل الـ TODO في `index.html`.
  - مزامنة lockfiles مع الاعتماديات الجديدة حتى لا يفشل `bun install --frozen-lockfile`.

3) النتيجة المتوقعة
- `vite build` ينجح بإعداد React قياسي ومستقر.
- المشروع يصبح static site صالحاً لـ Cloudflare Pages بدون الحاجة إلى Workers.
- Cloudflare لن يتعثر في قراءة `vite.config.ts`.
- مسارات React تعمل بعد refresh.
- المشروع يصبح production-ready من ناحية build/deploy config بدون hacks أو TODOs معلقة.

4) ملاحظة تنفيذية مهمة
- داخل المشروع سأجعل المسار الصحيح هو Cloudflare Pages.
- إذا كانت إعدادات Cloudflare الخارجية ما زالت تستخدم `npx wrangler deploy` فهذا إعداد نشر خاطئ خارج الكود؛ المشروع بعد التعديل سيكون جاهزاً للنشر عبر Pages/`dist` أو `wrangler pages deploy dist`، وليس عبر Workers `wrangler deploy`.

5) التفاصيل التقنية
```text
Current failing path
Cloudflare -> wrangler deploy -> tries Workers/Vite auto-setup
           -> parses dynamic vite.config
           -> fails: "could not find a valid plugins array"

Target path
Cloudflare Pages -> vite build -> dist
                 -> static hosting
                 -> _redirects handles SPA routes
                 -> frontend continues calling existing backend endpoints directly
```
