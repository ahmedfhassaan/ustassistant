import { MessageSquare, Users, FileText, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/hooks/use-theme";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";

interface DashboardStats {
  total_questions: number;
  unique_users: number;
  total_documents: number;
  cached_responses: number;
  total_responses: number;
  today_questions: number;
}

const AdminDashboard = () => {
  const { isDark } = useTheme();

  const { data: dashStats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_stats");
      if (error) throw error;
      return data as unknown as DashboardStats;
    },
  });

  const { data: questionStats, isLoading: questionsLoading, isError: questionsError, refetch: refetchQuestions } = useQuery({
    queryKey: ["question-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_question_stats", { limit_count: 10 });
      if (error) throw error;
      return data;
    },
  });

  const satisfactionRate = dashStats
    ? (dashStats as any).total_feedback > 0
      ? Math.round(((dashStats as any).positive_feedback / (dashStats as any).total_feedback) * 100)
      : 0
    : 0;

  const stats = [
    { label: "إجمالي المحادثات", value: dashStats?.total_questions ?? 0, icon: MessageSquare, color: "text-primary" },
    { label: "المستخدمون النشطون", value: dashStats?.unique_users ?? 0, icon: Users, color: "text-emerald-400" },
    { label: "المستندات المرفوعة", value: dashStats?.total_documents ?? 0, icon: FileText, color: "text-[hsl(var(--highlight))]" },
    { label: "معدل الرضا", value: `${satisfactionRate}%`, icon: TrendingUp, color: "text-purple-400" },
  ];

  const cardBase = isDark
    ? "glass-card border-0 hover:shadow-[0_8px_40px_rgba(112,200,255,0.08)]"
    : "bg-white border border-black/5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:translate-y-[-4px]";

  const questionRowBase = isDark
    ? "bg-white/5 hover:bg-white/8 border border-white/5"
    : "bg-secondary/30 hover:bg-secondary/60 border border-black/5 hover:border-primary/20";

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, idx) => (
          <Card
            key={stat.label}
            className={`transition-all duration-300 ease-out animate-fade-in-up rounded-2xl ${cardBase}`}
            style={{ animationDelay: `${0.1 + idx * 0.08}s`, opacity: 0 }}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.color} transition-all duration-200 ${
                isDark ? "bg-white/5 glow-highlight" : "bg-secondary"
              }`}>
                <stat.icon className={`w-6 h-6 ${isDark ? "glow-icon" : ""}`} />
              </div>
              <div>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mb-1" />
                ) : (
                  <p className={`text-3xl font-bold text-foreground ${isDark ? "glow-text" : ""}`}>
                    {stat.value.toLocaleString?.() ?? stat.value}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent popular questions */}
      <Card
        className={`transition-all duration-300 ease-out animate-fade-in-up rounded-2xl ${cardBase}`}
        style={{ animationDelay: "0.4s", opacity: 0 }}
      >
        <CardHeader className="pb-3">
          <CardTitle className={`text-xl font-bold ${isDark ? "text-primary glow-text" : "text-foreground"}`}>
            أكثر الأسئلة شيوعًا
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {questionsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))
            ) : questionsError ? (
              <ErrorState message="تعذّر تحميل الأسئلة الشائعة" onRetry={() => refetchQuestions()} />
            ) : questionStats && questionStats.length > 0 ? (
              questionStats.map((q, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 ease-out hover:translate-y-[-2px] ${questionRowBase}`}
                >
                  <span className="text-sm font-medium text-foreground truncate flex-1">{q.question}</span>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full whitespace-nowrap mr-3 ${
                    isDark ? "bg-primary/15 text-primary glow-text" : "bg-primary/10 text-primary font-extrabold"
                  }`}>
                    {q.count} مرة
                  </span>
                </div>
              ))
            ) : (
              <EmptyState
                icon={MessageSquare}
                title="لا توجد أسئلة بعد"
                description="ستظهر هنا أكثر الأسئلة شيوعاً بعد أن يبدأ الطلاب بالتفاعل مع المساعد"
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
