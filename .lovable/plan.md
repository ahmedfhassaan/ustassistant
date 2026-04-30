## المشكلة

السؤال **"كيف أقدم طلب تأجيل امتحان؟"** يُرجع إجابة عن **"إجراءات القبول وشروط التسجيل للاختبارات"** — وهي إجابة لا علاقة لها بالسؤال.

### السبب الجذري

من فحص شبكة الطلبات وجدول `response_cache`:

1. الاستجابة جاءت من الـ **Exact Cache** (`cached: true, semantic_cache: false`).
2. صفّ موجود فعلياً في جدول `response_cache`:
   - `question_hash = q_9ocgle`
   - `question = كيف أقدم طلب تأجيل امتحان؟`
   - `answer = ## 📋 إجراءات القبول وشروط التسجيل للاختبارات ...` (خاطئة تماماً)
   - تنتهي صلاحيته في `2026-04-30 21:06`
3. آلية الـ cache في `supabase/functions/chat/index.ts` تخزّن أول إجابة يولدها النموذج لأي سؤال جديد، وتُعيد استخدامها 24 ساعة (`cache_ttl_minutes = 1440`) بدون أي تحقق من جودتها. لذا أي إجابة سيئة تُولَّد لأول مرة "تتجمد" لمدة يوم كامل.

السبب الذي جعل النموذج يجيب خطأً في المرة الأولى لا يهم كثيراً الآن (الأرجح: الـ RAG استرجع مقطعاً عن "اختبارات القبول" بدلاً من مقطع "تأجيل امتحان"، أو لم يكن هناك محتوى عن التأجيل في المعرفة فاختار أقرب موضوع). المهم أن الإجابة الخاطئة الآن محفوظة في الـ cache.

## الخطة

### 1. حذف الإجابة الخاطئة فوراً من الـ cache (Migration)

تشغيل migration لحذف هذا الصف المحدد، وأي صفوف مشابهة قد تكون معطوبة:

```sql
DELETE FROM response_cache WHERE question_hash = 'q_9ocgle';
-- وأيضاً تنظيف أي إجابات سيئة معروفة عن التأجيل
DELETE FROM response_cache 
WHERE question ILIKE '%تأجيل%امتحان%' 
  AND answer NOT ILIKE '%تأجيل%';
```

### 2. ربط زر "غير مفيد" بإبطال الـ cache تلقائياً

في `supabase/functions/chat/index.ts` نضيف نقطة معالجة جديدة (أو نوسّع الموجودة) بحيث عندما يُسجَّل feedback سلبي على رسالة، نحذف صفّ الـ cache المطابق لـ `question_hash` للسؤال نفسه. وإذا كان من الـ semantic cache، نحذف الصف الأقرب أيضاً.

التنفيذ الأبسط: إضافة Database Trigger على جدول `message_feedback` يحذف من `response_cache` تلقائياً عند `is_helpful = false`:

```sql
CREATE OR REPLACE FUNCTION invalidate_cache_on_negative_feedback()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_helpful = false AND NEW.question_content IS NOT NULL THEN
    DELETE FROM response_cache 
    WHERE question = NEW.question_content
       OR question ILIKE '%' || LEFT(NEW.question_content, 30) || '%';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_invalidate_cache_on_feedback
AFTER INSERT ON message_feedback
FOR EACH ROW EXECUTE FUNCTION invalidate_cache_on_negative_feedback();
```

### 3. تقصير مدة الـ cache الافتراضية

حالياً 1440 دقيقة (24 ساعة). نخفّضها إلى **240 دقيقة (4 ساعات)** كقيمة افتراضية في `app_settings` لتقليل أثر أي إجابة سيئة. (المدير يقدر يغيّرها من لوحة الإعدادات بأي وقت.)

### 4. إضافة زر "مسح الكاش" في لوحة المدير

في `src/pages/AdminSettings.tsx` نضيف زرّاً سريعاً يستدعي `DELETE FROM response_cache` لتمكين المدير من حلّ هذا النوع من المشاكل بنفسه دون انتظارنا.

### 5. (اختياري — لاحقاً) عدم تخزين الإجابات قصيرة/الفارغة

في الـ Edge Function نضيف شرطاً: لا نحفظ في الـ cache إذا كانت الإجابة < 100 حرف أو إذا احتوت على كلمات مثل "لا أعرف" / "لا تتوفر معلومات". هذا يمنع تخزين إجابات الـ fallback السيئة.

## الملفات التي ستتغيّر

- **Migration جديد** — حذف الصف الفاسد + إنشاء trigger + تحديث `cache_ttl_minutes` الافتراضي.
- `supabase/functions/chat/index.ts` — إضافة شرط عدم تخزين الإجابات الضعيفة (الخطوة 5).
- `src/pages/AdminSettings.tsx` — زر "مسح الكاش".

## بعد التنفيذ

سيختفي الجواب الخاطئ فوراً، وأي ضغطة على "غير مفيد" مستقبلاً ستحذف الإجابة من الـ cache تلقائياً، فيُعاد توليد إجابة جديدة عند السؤال التالي.
