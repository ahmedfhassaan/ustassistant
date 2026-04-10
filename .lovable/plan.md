

# إصلاح نظام الـ Embeddings — المشكلة والحل

## المشكلة الحالية

دالة `generate-embedding` تستخدم **chat completions** لتوليد embeddings — تطلب من نموذج Gemini أن "يخترع" 768 رقماً عشوائياً. هذا **ليس بحثاً دلالياً حقيقياً** لأن:

- الأرقام المُنتجة غير متسقة: نفس النص يعطي أرقاماً مختلفة كل مرة
- لا توجد علاقة رياضية بين متجهات النصوص المتشابهة
- cosine similarity بين هذه المتجهات سيكون عشوائياً

## الحل: استخدام Gemini Embeddings API الحقيقي

Lovable AI Gateway يدعم `/v1/embeddings` مع نماذج Gemini. سنستبدل الأسلوب الحالي بطلب embeddings حقيقي.

---

## التعديلات

### 1. إعادة كتابة `generate-embedding/index.ts`
- استخدام endpoint `/v1/embeddings` بدلاً من `/v1/chat/completions`
- استخدام نموذج embedding مناسب (مثل `google/text-embedding-004`)
- إرسال النصوص دفعة واحدة بدلاً من واحد تلو الآخر
- إذا لم يدعم الـ gateway هذا الـ endpoint، نستخدم Google AI API مباشرة

### 2. تعديل حجم المتجه إذا لزم الأمر
- نموذج `text-embedding-004` من Google ينتج متجهات بحجم 768 (متوافق مع الحالي)
- إذا كان الحجم مختلفاً، نحتاج migration لتعديل عمود `vector`

### 3. إعادة توليد embeddings للمستندات الحالية
- الـ embeddings الحالية (إن وُجدت) ستكون عشوائية ويجب استبدالها

### 4. اختبار عملي
- بعد الإصلاح، سأنشئ ملف Markdown تجريبي لاختبار البحث الدلالي

---

## التفاصيل التقنية

**الملفات المتأثرة:**
- `supabase/functions/generate-embedding/index.ts` — إعادة كتابة كاملة
- قد نحتاج migration إذا تغيّر حجم المتجه

**الكود الجديد لـ generate-embedding:**
```typescript
// استخدام /v1/embeddings endpoint
const response = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "google/text-embedding-004",
    input: texts,
  }),
});
const data = await response.json();
// data.data[i].embedding → real vector
```

إذا لم يدعم الـ gateway هذا، سنجرب بديلاً باستخدام Google Generative AI API مباشرة.

