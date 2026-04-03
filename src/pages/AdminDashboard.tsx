import { MessageSquare, Users, FileText, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/hooks/use-theme";

const stats = [
  { label: "إجمالي المحادثات", value: "1,245", icon: MessageSquare, color: "text-primary" },
  { label: "المستخدمون النشطون", value: "328", icon: Users, color: "text-emerald-400" },
  { label: "المستندات المرفوعة", value: "24", icon: FileText, color: "text-[hsl(var(--highlight))]" },
  { label: "معدل الرضا", value: "87%", icon: TrendingUp, color: "text-purple-400" },
];

const recentQuestions = [
  { question: "متى يبدأ التسجيل للفصل القادم؟", count: 45 },
  { question: "ما هي شروط التحويل بين الأقسام؟", count: 38 },
  { question: "كيف أقدم طلب تأجيل امتحان؟", count: 32 },
  { question: "ما هي ساعات الدوام في المكتبة؟", count: 28 },
  { question: "كيف أحصل على كشف درجات رسمي؟", count: 25 },
];

const AdminDashboard = () => {
  const { isDark } = useTheme();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className={`transition-all duration-300 ${
            isDark ? "glass-card border-0 hover:shadow-[0_8px_40px_rgba(112,200,255,0.08)]" : ""
          }`}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.color} transition-all duration-200 ${
                isDark ? "bg-white/5 glow-highlight" : "bg-secondary"
              }`}>
                <stat.icon className={`w-6 h-6 ${isDark ? "glow-icon" : ""}`} />
              </div>
              <div>
                <p className={`text-3xl font-bold text-foreground ${isDark ? "glow-text" : ""}`}>{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent popular questions */}
      <Card className={`transition-all duration-300 ${
        isDark ? "glass-card border-0" : ""
      }`}>
        <CardHeader>
          <CardTitle className="text-lg">أكثر الأسئلة شيوعًا</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentQuestions.map((q, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                  isDark
                    ? "bg-white/5 hover:bg-white/8 border border-white/5"
                    : "bg-secondary/50 hover:bg-secondary"
                }`}
              >
                <span className="text-sm text-foreground">{q.question}</span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap mr-3 ${
                  isDark ? "bg-primary/15 text-primary" : "bg-primary/10 text-primary"
                }`}>
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

export default AdminDashboard;
