import { MessageSquare, Users, FileText, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "إجمالي المحادثات", value: "1,245", icon: MessageSquare, color: "text-primary" },
  { label: "المستخدمون النشطون", value: "328", icon: Users, color: "text-green-500" },
  { label: "المستندات المرفوعة", value: "24", icon: FileText, color: "text-amber-500" },
  { label: "معدل الرضا", value: "87%", icon: TrendingUp, color: "text-purple-500" },
];

const recentQuestions = [
  { question: "متى يبدأ التسجيل للفصل القادم؟", count: 45 },
  { question: "ما هي شروط التحويل بين الأقسام؟", count: 38 },
  { question: "كيف أقدم طلب تأجيل امتحان؟", count: 32 },
  { question: "ما هي ساعات الدوام في المكتبة؟", count: 28 },
  { question: "كيف أحصل على كشف درجات رسمي؟", count: 25 },
];

const AdminDashboard = () => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-secondary ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent popular questions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">أكثر الأسئلة شيوعًا</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentQuestions.map((q, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <span className="text-sm text-foreground">{q.question}</span>
                <span className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full whitespace-nowrap mr-3">
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
