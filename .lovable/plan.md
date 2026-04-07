

# حفظ المحادثات في قاعدة البيانات (سحابياً)

## الهدف
نقل تخزين المحادثات من localStorage إلى قاعدة البيانات، بحيث يستطيع الطالب الوصول لنفس سجل محادثاته من أي جهاز.

## الخطوات

### 1. إنشاء جداول قاعدة البيانات
- جدول `conversations`: يحتوي على (id, user_id, title, created_at)
- جدول `conversation_messages`: يحتوي على (id, conversation_id, role, content, source, question, created_at)
- سياسات RLS تسمح للجميع بالقراءة والكتابة (نفس نمط الجداول الحالية، لأن المصادقة تتم عبر جدول students وليس Supabase Auth)

### 2. تحديث طبقة التخزين (chatStorage.ts)
- استبدال localStorage بطلبات Supabase
- دوال: `loadConversations` و `saveConversation` و `updateConversationMessages`
- جعل الدوال async

### 3. تحديث صفحة المحادثة (Chat.tsx)
- تعديل useEffect لتحميل المحادثات من قاعدة البيانات
- حفظ كل محادثة جديدة ورسائلها في قاعدة البيانات بدلاً من localStorage
- إضافة حالة تحميل أولية أثناء جلب المحادثات

### 4. ترحيل البيانات المحلية (اختياري)
- عند أول تحميل، نقل المحادثات الموجودة في localStorage إلى قاعدة البيانات ثم حذفها محلياً

## التفاصيل التقنية

```text
students (موجود)
  └── conversations (جديد)
        ├── id (uuid, PK)
        ├── user_id (text) → student_id
        ├── title (text)
        └── created_at (timestamptz)
              └── conversation_messages (جديد)
                    ├── id (uuid, PK)
                    ├── conversation_id (uuid, FK)
                    ├── role (text: user/assistant)
                    ├── content (text)
                    ├── source (text, nullable)
                    ├── question (text, nullable)
                    └── created_at (timestamptz)
```

- RLS مفتوحة (public) لتتوافق مع نظام المصادقة الحالي القائم على جدول students
- الفلترة حسب user_id تتم في الكود

