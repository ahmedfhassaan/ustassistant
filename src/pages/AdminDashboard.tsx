import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  FileText,
  Users,
  TrendingUp,
  BarChart3,
  BookOpen,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import universityLogo from "@/assets/university-logo.png";

const stats = [
  { title: "إجمالي المحادثات", value: "1,284", icon: MessageSquare, change: "+12%" },
  { title: "المستندات المرفوعة", value: "47", icon: FileText, change: "+3" },
  { title: "الطلاب النشطون", value: "312", icon: Users, change: "+8%" },
  { title: "معدل الرضا", value: "94%", icon: TrendingUp, change: "+2%" },
];

const topQuestions = [
  { question: "ما هي مواعيد التسجيل للفصل القادم؟", count: 156 },
  { question: "كيف أحسب المعدل التراكمي؟", count: 134 },
  { question: "ما هي شروط التحويل بين التخصصات؟", count: 98 },
  { question: "متى تبدأ الامتحانات النهائية؟", count: 87 },
  { question: "كيف أقدم طلب تأجيل؟", count: 72 },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("admin");
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-secondary/50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-l border-border flex flex-col">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <img src={universityLogo} alt="الشعار" className="w-10 h-10" />
          <div>
            <h2 className="font-bold text-sm text-foreground">لوحة التحكم</h2>
            <p className="text-xs text-muted-foreground">المشرف</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link
            to="/admin"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === "/admin"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            لوحة التحكم
          </Link>
          <Link
            to="/admin/knowledge"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === "/admin/knowledge"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            قاعدة المعرفة
          </Link>
        </nav>
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">لوحة التحكم العامة</h1>
            <p className="text-muted-foreground text-sm mt-1">نظرة عامة على أداء المساعد الجامعي الذكي</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <Card key={stat.title}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <stat.icon className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <p className="text-xs text-green-600 mt-2 font-medium">{stat.change} من الأسبوع الماضي</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Top Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5 text-primary" />
                أكثر الأسئلة شيوعاً
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topQuestions.map((q, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-sm text-foreground">{q.question}</span>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground bg-background px-2 py-1 rounded">
                      {q.count} مرة
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
