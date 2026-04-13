
# تقييد حقل الرقم الجامعي لقبول الأرقام فقط

## التعديل

**ملف**: `src/pages/Login.tsx` — سطر 220

تغيير `onChange` لتصفية أي حرف غير رقمي:

```typescript
// من
onChange={(e) => setStudentId(e.target.value)}

// إلى
onChange={(e) => setStudentId(e.target.value.replace(/\D/g, ""))}
```

وإضافة `inputMode="numeric"` و `pattern="[0-9]*"` للحقل لعرض لوحة أرقام على الهواتف.

تعديل سطر واحد فقط.
