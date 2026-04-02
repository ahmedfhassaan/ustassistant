import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/hooks/use-theme";

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
  "تسجيل": "bg-blue-500/20 text-blue-300",
  "إداري": "bg-amber-500/20 text-amber-300",
  "امتحانات": "bg-red-500/20 text-red-300",
  "خدمات": "bg-green-500/20 text-green-300",
  "مالي": "bg-purple-500/20 text-purple-300",
  "أكاديمي": "bg-cyan-500/20 text-cyan-300",
};

const categoryColorsLight: Record<string, string> = {
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
  const { isDark } = useTheme();

  const getCategoryColor = (cat: string) => isDark ? categoryColors[cat] : categoryColorsLight[cat] || "bg-secondary text-foreground";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { value: faqData.length, label: "سؤال فريد" },
          { value: totalQuestions, label: "إجمالي التكرارات" },
          { value: `${answeredCount}/${faqData.length}`, label: "أسئلة مُجابة", highlight: true },
        ].map((s, i) => (
          <Card key={i} className={`transition-all duration-300 ${isDark ? "glass-card border-0" : ""}`}>
            <CardContent className="p-5 text-center">
              <p className={`text-2xl font-bold ${s.highlight ? "text-primary" : "text-foreground"}`}>{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Questions list */}
      <Card className={`transition-all duration-300 ${isDark ? "glass-card border-0" : ""}`}>
        <CardHeader>
          <CardTitle className="text-lg">الأسئلة الأكثر تكرارًا</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {faqData.map((q, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-4 rounded-lg transition-all duration-200 ${
                  isDark
                    ? "bg-white/5 border border-white/5 hover:bg-white/8"
                    : "border border-border hover:bg-secondary/50"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg font-bold text-muted-foreground/50 w-6 text-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{q.question}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(q.category)}`}>
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
