import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, HelpCircle, BarChart3, LogOut, Upload, MessageSquare, Users } from "lucide-react";
import universityLogo from "@/assets/university-logo.png";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const stats = [
    { label: "إجمالي المحادثات", value: "1,245", icon: MessageSquare, color: "text-primary" },
    { label: "المستندات المرفوعة", value: "32", icon: FileText, color: "text-primary" },
    { label: "الأسئلة الشائعة", value: "87", icon: HelpCircle, color: "text-primary" },
    { label: "المستخدمون النشطون", value: "340", icon: Users, color: "text-primary" },
  ];

  const recentQuestions = [
    { question: "ما هو موعد بداية الفصل الدراسي؟", count: 45 },
    { question: "كيف أقوم بتسجيل المقررات؟", count: 38 },
    { question: "ما هي شروط التحويل بين الأقسام؟", count: 29 },
    { question: "متى تبدأ الامتحانات النهائية؟", count: 25 },
    { question: "كيف أحصل على إفادة قيد؟", count: 22 },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={universityLogo} alt="شعار الجامعة" className="w-10 h-auto" />
          <div>
            <h1 className="text-lg font-bold text-foreground">لوحة تحكم المشرف</h1>
            <p className="text-xs text-muted-foreground">المساعد الجامعي الذكي</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/knowledge")}>
            <Upload className="w-4 h-4 ml-1" />
            إدارة المستندات
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <LogOut className="w-4 h-4 ml-1" />
            خروج
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Top Questions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5 text-primary" />
              أكثر الأسئلة شيوعًا
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentQuestions.map((q, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <span className="text-sm text-foreground">{q.question}</span>
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                    {q.count} مرة
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;
