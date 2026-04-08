

# إصلاح خطأين في البناء

## المشكلة
1. **Cloudflare Wrangler** يتطلب Vite 6+ لكن تم تخفيض الإصدار إلى 5.4.19
2. **خطأ TypeScript** في `supabase/functions/chat/index.ts` السطر 186: نوع `unknown[]` غير متوافق مع `string[]`

## الحل

### 1. إرجاع Vite إلى الإصدار 6
- تعديل `package.json`: إرجاع `"vite": "^6.0.0"`

### 2. إصلاح خطأ TypeScript في دالة chat
- السطر 186: إضافة تحويل نوع صريح:
  ```typescript
  sourceNames = [...new Set(chunks.map((c: any) => c.document_name as string))];
  ```

