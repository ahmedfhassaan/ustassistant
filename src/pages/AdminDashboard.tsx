import { useEffect, useState } from "react";
import { MessageSquare, Users, FileText, TrendingUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  total_questions: number;
  unique_users: number;
  total_documents: number;
  cached_responses: number;
  today_questions: number;
  total_responses: number;
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
  const [questions, setQuestions] = useState<QuestionStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [statsRes, questionsRes] = await Promise.all([
        supabase.rpc("get_dashboard_stats"),
        supabase.rpc("get_question_stats", { limit_count: 10 }),
      ]);

      if (statsRes.data) {
        const d = statsRes.data as unknown as DashboardStats;
        setStats(d);
      }
      if (questionsRes.data) {
        setQuestions(questionsRes.data as QuestionStat[]);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const statCards = stats
    ? [
        { label: "إجمالي الأسئلة", value: stats.total_questions.toLocaleString("ar-SA"), icon: MessageSquare, color: "text-primary" },
        { label: "المستخدمون الفريدون", value: stats.unique_users.toLocaleString("ar-SA"), icon: Users, color: "text-emerald-400" },
        { label: "المستندات المرفوعة", value: stats.total_documents.toLocaleString("ar-SA"), icon: FileText, color: "text-[hsl(var(--highlight))]" },
        { label: "الإجابات المخزّنة مؤقتاً", value: stats.cached_responses.toLocaleString("ar-SA"), icon: TrendingUp, color: "text-purple-400" },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
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

      {/* Recent popular questions */}
      <Card className={`transition-all duration-300 animate-fade-in-up ${
        isDark ? "glass-card border-0" : ""
      }`} style={{ animationDelay: "0.4s", opacity: 0 }}>
        <CardHeader>
          <CardTitle className={`text-xl font-bold ${isDark ? "text-primary glow-text" : "text-foreground"}`}>أكثر الأسئلة شيوعًا</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {questions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">لا توجد أسئلة مسجّلة بعد</p>
            ) : (
              questions.map((q, i) => (
                <div
                  key={q.question_hash}
                  className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                    isDark
                      ? "bg-white/5 hover:bg-white/8 border border-white/5"
                      : "bg-secondary/50 hover:bg-secondary"
                  }`}
                >
                  <span className="text-sm font-medium text-foreground">{q.question}</span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap mr-3 ${
                    isDark ? "bg-primary/15 text-primary glow-text" : "bg-primary/10 text-primary"
                  }`}>
                    {q.count} مرة
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
