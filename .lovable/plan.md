

# إزالة `wrangler.jsonc` — السبب الجذري لفشل النشر

## التشخيص

بعد فحص المشروع بالكامل، الملف الوحيد المتبقي الذي يحتوي على إعدادات Wrangler هو:

**`wrangler.jsonc`** — هذا الملف هو السبب المباشر لأن Cloudflare يعامل المشروع كـ Worker ويشغّل `npx wrangler deploy` تلقائياً بدلاً من نشره كـ static Pages site.

عندما يجد Cloudflare ملف `wrangler.jsonc` أو `wrangler.toml` في جذر المشروع، يفترض تلقائياً أن المشروع هو Worker/Pages Function ويشغّل مسار Wrangler deploy — حتى لو لم يكن هناك deploy script في `package.json`.

## التعديلات المطلوبة

### 1. حذف `wrangler.jsonc`
- **السبب**: وجوده يجبر Cloudflare على استخدام مسار Workers بدلاً من Pages static hosting.
- لا حاجة لهذا الملف في مشروع static site ينشر عبر Cloudflare Pages dashboard.

### 2. تحديث `.lovable/plan.md`
- إزالة السطر الذي يقول "Keep wrangler.jsonc" وتحديثه ليعكس أنه تم حذفه.

لا يوجد أي ملف آخر في المشروع (خارج `node_modules`) يشير إلى Wrangler.

## إعدادات Cloudflare Pages Dashboard
- **Build command**: `bun run build`
- **Output directory**: `dist`
- **Deploy command**: فارغ (لا شيء)

## النتيجة
- Cloudflare سيعامل المشروع كـ static site بالكامل
- لن يحاول تشغيل `wrangler deploy` مطلقاً
- `_redirects` يتكفل بـ SPA routing

