## الهدف
إذا كان السؤال متعلقاً بـ"نماذج الامتحانات السابقة"، يجب أن يبحث المساعد فقط في مستندات تصنيف **«نماذج الامتحانات السابقة»** ولا يستخدم أي مصدر آخر (لا قاعدة معرفة عامة، ولا بحث مباشر على الويب).

## التغييرات في `supabase/functions/chat/index.ts`

### 1) إضافة intent جديد `exam_papers`
- إضافة `exam_papers` إلى نوع `QuestionIntent`.
- في `classifyIntent()`، فحص الكلمات المفتاحية أولاً (قبل graduation_projects):
  - "نماذج امتحانات", "نموذج امتحان", "امتحان سابق", "امتحانات سابقة", "أسئلة امتحان", "اسئلة امتحان", "حل امتحان", "إجابة امتحان", "اختبار سابق", إلخ.
- إذا اكتُشفت نية المتابعة (سياق الجلسة)، السياق المُعاد صياغته من `rewrite-query` سيحتوي تلقائياً كلمات الامتحانات → `classifyIntent` يطابق.

### 2) فلترة المستندات بالتصنيف
- بعد الـ hybrid search، عند `intent === "exam_papers"`:
  - استرجاع `category` من جدول `knowledge_documents` للـ `chunks` المسترجعة (join بسيط أو map ID→category).
  - الإبقاء فقط على chunks التي مستندها الأم بتصنيف `"نماذج الامتحانات السابقة"`.
  - إذا لم يبقَ أي chunk، إعادة رسالة fallback مهذبة بدلاً من البحث في مصادر أخرى.

**طريقة أبسط (مفضّلة):** بدلاً من join منفصل، تعديل دالة `search_knowledge_hybrid` SQL لتُرجع أيضاً `category`، ثم الفلترة في الكود. (يتطلب migration.)

### 3) منع البحث المباشر (live search)
- في بوابة `LIVE SEARCH gate` (السطر ~893): إضافة شرط `if (intent === "exam_papers") skip live search`.
- بهذا حتى لو لم تُجد المستندات إجابة، لا يُستعان بـ Google Grounding أو ust.edu.

### 4) فلترة intent مقابل documents
- إضافة منطق مماثل لـ `shouldExcludeProjects`: عند intent غير `exam_papers`، إزالة chunks ذات تصنيف "نماذج الامتحانات السابقة" حتى لا تتسرب في إجابات أخرى.

## migration مطلوب

تعديل `search_knowledge_hybrid` لإرجاع عمود `category` إضافي:

```sql
-- تحديث الدالة لإضافة category في الإخراج
CREATE OR REPLACE FUNCTION public.search_knowledge_hybrid(...)
RETURNS TABLE(chunk_id uuid, document_name text, category text, content text, rank real)
...
SELECT kc.id, kd.name, kd.category, kc.content, ...
```

بديل بدون migration: استعلام إضافي بعد البحث لجلب categories — أبطأ قليلاً لكن لا يحتاج تغيير DB.

## معايير القبول
- «اعرض لي سؤال من نماذج الامتحانات السابقة» → المصدر الوحيد ملف امتحان ✓
- «ما الإجابة» (متابعة) → بفضل سياق الجلسة، المصدر يبقى ملف الامتحان ✓
- لا live search لأسئلة الامتحانات.
- الأسئلة الأخرى (قبول، خطة دراسية...) لا تجلب chunks من تصنيف الامتحانات.

## ملاحظة
أوصي بـ migration للدالة (الخيار الأنظف). إن وافقت، سأطبقها مع تعديلات كود الـ chat function في مرحلة التنفيذ.
