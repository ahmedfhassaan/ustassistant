import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const faqData = [
  { question: "متى يبدأ التسجيل للفصل القادم؟", count: 45, category: "تسجيل", answered: true },
  { question: "ما هي شروط التحويل بين الأقسام؟", count: 38, category: "إداري", answered: true },
  { question: "كيف أقدم طلب تأجيل امتحان؟", count: 32, category: "امتحانات", answered: true },
  { question: "ما هي ساعات الدوام في المكتبة؟", count: 28, category: "خدمات", answered: true },
  { question: "كيف أحصل على كشف درجات رسمي؟", count: 25, category: "إداري", answered: true },
  { question: "ما هي رسوم الفصل الدراسي؟", count: 22, category: "مالي", answered: false },
  { question: "هل يوجد سكن جامعي؟", count: 20, category: "خدمات", answered: false },
  { question: "ما هو الحد الأدنى للمعدل التراكمي؟", count: 18, category: "أكاديمي", answered: true },
];

const categoryColors: Record<string, string> = {
  "تسجيل": "bg-blue-100 text-blue-700",
  "إداري": "bg-amber-100 text-amber-700",
  "امتحانات": "bg-red-100 text-red-700",
  "خدمات": "bg-green-100 text-green-700",
  "مالي": "bg-purple-100 text-purple-700",
  "أكاديمي": "bg-cyan-100 text-cyan-700",
};

const AdminFAQ = () => {
  const totalQuestions = faqData.reduce((sum, q) => sum + q.count, 0);
  const answeredCount = faqData.filter((q) => q.answered).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-2xl font-bold text-foreground">{faqData.length}</p>
            <p className="text-sm text-muted-foreground">سؤال فريد</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-2xl font-bold text-foreground">{totalQuestions}</p>
            <p className="text-sm text-muted-foreground">إجمالي التكرارات</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-2xl font-bold text-primary">{answeredCount}/{faqData.length}</p>
            <p className="text-sm text-muted-foreground">أسئلة مُجابة</p>
          </CardContent>
        </Card>
      </div>

      {/* Questions list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">الأسئلة الأكثر تكرارًا</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {faqData.map((q, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg font-bold text-muted-foreground/50 w-6 text-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{q.question}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[q.category] || "bg-secondary text-foreground"}`}>
                        {q.category}
                      </span>
                      <Badge variant={q.answered ? "default" : "secondary"} className="text-xs">
                        {q.answered ? "مُجاب" : "بدون إجابة"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <span className="text-sm font-semibold text-primary whitespace-nowrap mr-3">
                  {q.count} مرة
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFAQ;
