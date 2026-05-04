
# تحسين تنسيق الألوان في صفحة التوثيق

الألوان الحالية في `Documentation.tsx` تستخدم درجات شفافية متفاوتة وغير منسجمة (`/10`, `/15`, `/20`, `/30`)، مما يخلق "ضوضاء بصرية" ويتعارض مع فلسفة الهدوء والبساطة في المشروع. الهدف: توحيد سُلَّم القوة (8 / 15 / 20) وتخفيف اللمعان دون تغيير المحتوى أو البنية.

## الملف المُعدَّل (1 فقط)
**`src/pages/Documentation.tsx`** — تعديلات نقطية على Tailwind classes فقط. لا تغيير في `index.css` ولا في tokens النظام.

## التعديلات

### 1. الهيرو (السطر ~168)
- خلفية متدرجة: `from-primary/15` ← **`from-primary/8`** (تخفيف الإشباع).
- كرة الـ blur: `bg-primary/20` ← **`bg-primary/10`**.
- صندوق أيقونة Sparkles: `bg-primary/15 border border-primary/30` ← **`bg-primary/8 ring-1 ring-primary/20`** (إطار رفيع متّسق).

### 2. `SectionHeader` (السطر ~76)
- صندوق الأيقونة: `bg-primary/10` ← **`bg-primary/8 ring-1 ring-primary/15`**.
- رقم القسم: `text-primary` ← **`text-primary/80 font-semibold`** (يبقى مميَّزاً لكن أقل صراخاً).

### 3. `Notice` (السطر ~96)
- `warn`: `bg-destructive/10 border-destructive/30` ← **`bg-destructive/8 border-destructive/20`**.
- `success`: `bg-primary/10 border-primary/30` ← **`bg-primary/8 border-primary/20`**.
- `info`: `bg-muted` ← **`bg-muted/50`** (أخفّ).

### 4. `MiniCard` (السطر ~120)
- `border-border bg-card/50` ← **`border-border/60 bg-muted/30`** — تباين أوضح عن الـ Card الأم وأنعم بصرياً.

### 5. فهرس المحتويات (السطر ~219)
- الرابط: `border-border bg-card/40 hover:bg-primary/5 hover:border-primary/30` ← **`border-border/60 bg-muted/20 hover:bg-primary/8 hover:border-primary/25`**.
- مربع الرقم: `bg-muted text-muted-foreground` ← **`bg-primary/10 text-primary`** — لربطه بصرياً بأرقام `SectionHeader`.

## ما لن يتغيّر
- بنية الأقسام، النصوص، الأيقونات، الجداول، الـ Bullets.
- `index.css` و design tokens.
- الترويسة، الفوتر، التنقل.
- يبقى دعم Dark/Light mode سليماً (كل الألوان عبر tokens).

## المبرر
- توحيد سُلَّم الشفافية (**8 / 15-20 / 60**) يخلق إيقاعاً بصرياً متّسقاً.
- استبدال `border` بـ `ring-1` على العناصر الزخرفية يعطي إحساساً أرقّ وأكثر حداثة.
- ربط فهرس المحتويات بالأرقام داخل الأقسام يخلق وحدة بصرية بين الفهرس والمحتوى.
- يتوافق مع ذاكرة `Visual Direction`: «glassmorphism, subtle glow» — التخفيف الحالي يدعم هذا.

## المخاطر
- لا مخاطر وظيفية. التغييرات بصرية بحتة.
- في Light mode قد يبدو `bg-primary/8` خفيفاً جداً على بعض الشاشات؛ سُلَّم 8 مع `ring-1` يضمن البقاء مرئياً.

## الرجوع
تراجع فوري بعكس الـ classes المذكورة (5 كتل تعديل صغيرة في ملف واحد).
