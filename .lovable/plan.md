## الهدف
عند الضغط على أي ملف في صفحة قاعدة المعرفة، يُفتح حوار (Dialog) يعرض محتوى الملف بصيغة Markdown قابلة للقراءة، مع زر إغلاق.

## السلوك
- الصف بأكمله يصبح قابلاً للنقر (cursor-pointer + hover). زر الحذف يبقى يعمل بشكل مستقل (`stopPropagation`).
- إذا كان للمستند `file_path` → نُنزّل الملف من Storage bucket `knowledge` ونعرض نصّه.
- إذا لم يكن (مثل المستندات المزحوفة أو القديمة بدون ملف أصلي) → نجمع المحتوى من `knowledge_chunks` مرتّباً بـ `chunk_index` ونعرضه.
- أثناء التحميل: spinner داخل الـ Dialog. عند الفشل: رسالة خطأ.
- زر «فتح المصدر الأصلي» يظهر إن وُجد `source_url`.
- يستخدم `react-markdown` + `remark-gfm` (موجودَين في المشروع للدردشة) داخل غلاف `.prose-chat` للتنسيق العربي/RTL.

## التعديل
ملف واحد: `src/pages/AdminKnowledge.tsx`
1. إضافة state: `viewTarget: KnowledgeDoc | null`، `viewContent: string`، `viewLoading: boolean`، `viewError: string`.
2. دالة `openViewer(doc)` تُحمّل المحتوى (storage أولاً، ثم تجميع chunks).
3. جعل الـ row يستدعي `openViewer(doc)` عند النقر؛ تغليف زر الحذف بـ `onClick={(e) => { e.stopPropagation(); setDeleteTarget(doc); }}`.
4. إضافة Dialog جديد (نستخدم `@/components/ui/dialog` الموجود) يعرض:
   - العنوان: اسم الملف + شارة النوع (يدوي/موقع).
   - منطقة قابلة للتمرير `max-h-[70vh] overflow-y-auto` تحوي الـ Markdown مُرنْدَر.
   - Footer: «فتح المصدر» (إن وُجد) + «إغلاق».

## بدون تغييرات
- لا تعديلات على قاعدة البيانات أو Edge Functions.
- لا تغيير على الإعدادات.
