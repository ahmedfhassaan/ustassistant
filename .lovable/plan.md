## المشكلة
زر التفعيل (Switch) في بطاقة "مصدر الويب" يبدو مكسوراً في وضع RTL — الإبهام (thumb) يتحرك في الاتجاه الخاطئ ويبدو خارج المسار، لأن Radix Switch يستخدم `translate-x` ثابتاً لا يتأقلم مع RTL.

## الإصلاح
لف الـ Switch بـ `<span dir="ltr">` لإجباره على السلوك الافتراضي بصرف النظر عن RTL الأب. هذه نفس الحيلة المستخدمة عادة مع مكونات Radix الحساسة للاتجاه.

## التغيير
في `src/components/admin/WebSourceCard.tsx` — السطر الذي يحتوي `<Switch id="web-enabled" ...>`:

```tsx
<span dir="ltr" className="inline-flex">
  <Switch id="web-enabled" checked={enabled} onCheckedChange={setEnabled} />
</span>
```

ملف واحد، تغيير سطرين. لا تأثير على أي مكان آخر.