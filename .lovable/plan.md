

# إضافة إمكانية تعديل الرقم الجامعي للمشرف

## الفكرة
حالياً الرقم الجامعي للمشرف مكتوب يدوياً في الكود (`"20260000"`). سنجعله إعداداً قابلاً للتعديل من لوحة التحكم.

## التغييرات

### 1. `src/hooks/use-settings.ts`
- إضافة `admin_student_id: "20260000"` إلى interface و DEFAULTS

### 2. `src/pages/AdminSettings.tsx`
- إضافة حقل Input في تبويب الأمان بعنوان "الرقم الجامعي للمشرف" يسمح بتعديل وحفظ القيمة

### 3. `src/pages/Login.tsx`
- بدلاً من المقارنة الثابتة `=== "20260000"`، جلب قيمة `admin_student_id` من جدول `assistant_settings` والمقارنة بها:
```typescript
const { data: adminIdData } = await supabase
  .from("assistant_settings")
  .select("value")
  .eq("key", "admin_student_id")
  .maybeSingle();
const adminId = adminIdData?.value || "20260000";
if (studentId.trim() === adminId) { ... }
```

## الملفات المتأثرة
- `src/hooks/use-settings.ts` — سطر في interface + سطر في DEFAULTS
- `src/pages/AdminSettings.tsx` — إضافة حقل إدخال
- `src/pages/Login.tsx` — تعديل منطق التحقق من المشرف

