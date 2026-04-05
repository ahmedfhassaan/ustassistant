import { useEffect, useState } from "react";
import { MessageSquare, Users, FileText, TrendingUp, Loader2, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  total_questions: number;
  unique_users: number;
  total_documents: number;
  cached_responses: number;
  total_responses: number;
  today_questions: number;
}

interface QuestionStat {
  question: string;
  question_hash: string;
  count: number;
  last_asked: string;
}

const AdminDashboard = () => {
  const { isDark } = useTheme();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topQuestions, setTopQuestions] = useState<QuestionStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, questionsRes] = await Promise.all([
        supabase.rpc("get_dashboard_stats"),
        supabase.rpc("get_question_stats", { limit_count: 10 }),
      ]);

      if (statsRes.data) setStats(statsRes.data as unknown as DashboardStats);
      if (questionsRes.data) setTopQuestions(questionsRes.data as unknown as QuestionStat[]);
    } catch (e) {
      console.error("Error fetching dashboard data:", e);
    }
    setLoading(false);
  };

  const cacheRate = stats && stats.total_responses > 0
    ? Math.round((stats.cached_responses / stats.total_responses) * 100)
    : 0;

  const statCards = [
    { label: "إجمالي الأسئلة", value: stats?.total_questions?.toLocaleString("ar-SA") || "0", icon: MessageSquare, color: "text-primary" },
    { label: "المستخدمون", value: stats?.unique_users?.toLocaleString("ar-SA") || "0", icon: Users, color: "text-emerald-400" },
    { label: "المستندات الجاهزة", value: stats?.total_documents?.toLocaleString("ar-SA") || "0", icon: FileText, color: "text-[hsl(var(--highlight))]" },
    { label: "نسبة التخزين المؤقت", value: `${cacheRate}%`, icon: Zap, color: "text-purple-400" },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <Card key={stat.label} className={`transition-all duration-300 animate-fade-in-up hover:translate-y-[-2px] ${
            isDark ? "glass-card border-0 hover:shadow-[0_8px_40px_rgba(112,200,255,0.08)]" : ""
          }`} style={{ animationDelay: `${0.1 + idx * 0.08}s`, opacity: 0 }}>
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

      {/* Today's activity */}
      {stats && stats.today_questions > 0 && (
        <Card className={`transition-all duration-300 animate-fade-in-up ${
          isDark ? "glass-card border-0" : ""
        }`} style={{ animationDelay: "0.35s", opacity: 0 }}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl text-primary transition-all duration-200 ${
              isDark ? "bg-white/5 glow-highlight" : "bg-secondary"
            }`}>
              <TrendingUp className={`w-6 h-6 ${isDark ? "glow-icon" : ""}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold text-foreground ${isDark ? "glow-text" : ""}`}>
                {stats.today_questions.toLocaleString("ar-SA")}
              </p>
              <p className="text-sm text-muted-foreground">أسئلة اليوم (آخر 24 ساعة)</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent popular questions */}
      <Card className={`transition-all duration-300 animate-fade-in-up ${
        isDark ? "glass-card border-0" : ""
      }`} style={{ animationDelay: "0.4s", opacity: 0 }}>
        <CardHeader>
          <CardTitle className={`text-xl font-bold ${isDark ? "text-primary glow-text" : "text-foreground"}`}>أكثر الأسئلة شيوعًا</CardTitle>
        </CardHeader>
        <CardContent>
          {topQuestions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              لم تُسجَّل أي أسئلة بعد. ستظهر الإحصائيات هنا عند بدء استخدام المحادثة.
            </p>
          ) : (
            <div className="space-y-3">
              {topQuestions.map((q, i) => (
                <div
                  key={q.question_hash}
                  className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                    isDark
                      ? "bg-white/5 hover:bg-white/8 border border-white/5"
                      : "bg-secondary/50 hover:bg-secondary"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg font-bold text-muted-foreground/50 w-6 text-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-foreground truncate">{q.question}</span>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap mr-3 ${
                    isDark ? "bg-primary/15 text-primary glow-text" : "bg-primary/10 text-primary"
                  }`}>
                    {q.count} مرة
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
