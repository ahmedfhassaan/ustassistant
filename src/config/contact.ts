/**
 * بيانات التواصل المركزية — عدّل هذا الملف فقط لتحديث جميع واجهات التواصل في النظام.
 * أي حقل فارغ ("") لن تظهر بطاقته في صفحة /contact.
 */
export const contactInfo = {
  supportEmail: "support@ustassistant.online",
  registrationEmail: "registration@ust.edu",
  whatsapp: "", // مثال: "+967777123456" — يُترك فارغاً لإخفاء البطاقة
  workingHours: "الأحد - الخميس، 8 صباحاً - 3 عصراً",
  universityWebsite: "https://ust.edu",
  reportIssueNote: "للإبلاغ عن إجابة خاطئة، استخدم زر 👎 أسفل الرسالة في المحادثة.",
};

// رابط واتساب جاهز (بدون + و بدون مسافات)
export const whatsappLink = (number: string) =>
  `https://wa.me/${number.replace(/[^\d]/g, "")}`;
