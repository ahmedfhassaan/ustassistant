import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/hooks/use-theme";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminFAQ = () => {
  const { isDark } = useTheme();

  const { data: questions, isLoading: loadingQuestions, refetch } = useQuery({
    queryKey: ["faq-questions"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_question_stats", { limit_count: 50 });
      if (error) throw error;
      return data as { question: string; question_hash: string; count: number; last_asked: string }[];
    },
    refetchInterval: 30000,
  });

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["faq-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_stats");
      if (error) throw error;
      return data as {
        total_questions: number;
        total_feedback: number;
        positive_feedback: number;
      };
    },
    refetchInterval: 30000,
  });

  const totalRepetitions = questions?.reduce((sum, q) => sum + Number(q.count), 0) ?? 0;
  const uniqueCount = questions?.length ?? 0;
  const answeredRatio = stats
    ? `${stats.total_questions}/${uniqueCount}`
    : "—";

  const isLoading = loadingQuestions || loadingStats;

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { value: uniqueCount, label: "سؤال فريد" },
          { value: totalRepetitions, label: "إجمالي التكرارات" },
          { value: answeredRatio, label: "إجمالي المحادثات / أسئلة فريدة", highlight: true },
        ].map((s, i) => (
          <Card
            key={i}
            className={`transition-all duration-300 animate-fade-in-up hover:translate-y-[-2px] ${isDark ? "glass-card border-0" : ""}`}
            style={{ animationDelay: `${0.1 + i * 0.08}s`, opacity: 0 }}
          >
            <CardContent className="p-5 text-center">
              {isLoading ? (
                <Skeleton className="h-8 w-16 mx-auto mb-1" />
              ) : (
                <p className={`text-2xl font-bold ${s.highlight ? "text-primary" : "text-foreground"}`}>
                  {s.value}
                </p>
              )}
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Questions list */}
      <Card
        className={`transition-all duration-300 animate-fade-in-up ${isDark ? "glass-card border-0" : ""}`}
        style={{ animationDelay: "0.35s", opacity: 0 }}
      >
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">الأسئلة الأكثر تكرارًا</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => refetch()} className="h-8 w-8">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : !questions?.length ? (
            <p className="text-center text-muted-foreground py-8">لا توجد أسئلة مسجلة بعد</p>
          ) : (
            <div className="space-y-2">
              {questions.map((q, i) => (
                <div
                  key={q.question_hash}
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
                      <p className="text-sm font-medium text-foreground truncate">{q.question}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {new Date(q.last_asked).toLocaleDateString("ar-SA")}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFAQ;
