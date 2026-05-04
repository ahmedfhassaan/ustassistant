## الهدف
حالياً شريط التمرير (scrollbar) في الوضع النهاري يظهر بشكل المتصفح الافتراضي (سميك ورمادي)، بينما في الوضع الليلي يبدو أكثر انسجاماً مع التصميم. سأضيف تنسيقاً موحداً لشريط التمرير في الوضعين بنفس الأسلوب الأنيق (نحيف، شفاف، بلمسة من اللون الأساسي الأزرق).

## التغييرات

### ملف واحد فقط: `src/index.css`
إضافة تنسيقات scrollbar مخصصة عامة داخل `@layer base`:

- **عرض نحيف**: 8px للعمودي، 8px للأفقي
- **المسار (track)**: شفاف تماماً
- **المقبض (thumb)**: 
  - الوضع النهاري: `hsl(var(--primary) / 0.25)` مع زوايا دائرية
  - الوضع الليلي: نفس اللون مع نفس الشفافية (متطابق تماماً)
  - عند المرور: شفافية أعلى `0.4`
- **دعم Firefox**: `scrollbar-width: thin` و `scrollbar-color`
- **دعم Webkit**: `::-webkit-scrollbar`, `::-webkit-scrollbar-thumb`, `::-webkit-scrollbar-track`

### التفاصيل التقنية
```css
* {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--primary) / 0.25) transparent;
}
*::-webkit-scrollbar { width: 8px; height: 8px; }
*::-webkit-scrollbar-track { background: transparent; }
*::-webkit-scrollbar-thumb {
  background: hsl(var(--primary) / 0.25);
  border-radius: 8px;
}
*::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--primary) / 0.4);
}
```

## النتيجة
- شريط التمرير سيكون متطابقاً في الوضعين النهاري والليلي
- نحيف، أنيق، بلمسة زرقاء خفيفة من لون الهوية
- لا يُغيّر أي وظيفة، فقط المظهر
- ينطبق على جميع العناصر القابلة للتمرير (المحادثات، السايدبار، اللوحات الإدارية)