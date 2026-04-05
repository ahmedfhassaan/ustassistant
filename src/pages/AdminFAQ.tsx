import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/hooks/use-theme";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const categoryColors: Record<string, string> = {
  "تسجيل": "bg-blue-500/20 text-blue-300",
  "إداري": "bg-amber-500/20 text-amber-300",
  "امتحانات": "bg-red-500/20 text-red-300",
  "خدمات": "bg-green-500/20 text-green-300",
  "مالي": "bg-purple-500/20 text-purple-300",
  "أكاديمي": "bg-cyan-500/20 text-cyan-300",
  "عام": "bg-gray-500/20 text-gray-300",
};

const categoryColorsLight: Record<string, string> = {
  "تسجيل": "bg-blue-100 text-blue-700",
  "إداري": "bg-amber-100 text-amber-700",
  "امتحانات": "bg-red-100 text-red-700",
  "خدمات": "bg-green-100 text-green-700",
  "مالي": "bg-purple-100 text-purple-700",
  "أكاديمي": "bg-cyan-100 text-cyan-700",
  "عام": "bg-gray-100 text-gray-700",
};

const AdminFAQ = () => {
  const { isDark } = useTheme();

  const { data: questions, isLoading: loadingQuestions, refetch } = useQuery({
    queryKey: ["faq-questions"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_question_stats", { limit_count: 50 });
      if (error) throw error;
      return data as { question: string; question_hash: string; count: number; last_asked: string; category: string | null; answered: boolean }[];
    },
    refetchInterval: 30000,
  });

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["faq-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_stats");
      if (error) throw error;
      return data as { total_questions: number; total_feedback: number; positive_feedback: number };
    },
    refetchInterval: 30000,
  });

  const totalRepetitions = questions?.reduce((sum, q) => sum + Number(q.count), 0) ?? 0;
  const uniqueCount = questions?.length ?? 0;
  const answeredCount = questions?.filter((q) => q.answered).length ?? 0;

  const isLoading = loadingQuestions || loadingStats;

  const getCategoryColor = (cat: string) =>
    isDark
      ? categoryColors[cat] || categoryColors["عام"]
      : categoryColorsLight[cat] || categoryColorsLight["عام"];

  const cardBase = isDark
    ? "glass-card border-0"
    : "bg-white border border-black/5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:translate-y-[-4px]";

  const questionRowBase = isDark
    ? "bg-white/5 border border-white/5 hover:bg-white/8"
    : "bg-secondary/30 border border-black/5 hover:bg-secondary/60 hover:border-primary/20 hover:translate-y-[-2px]";

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { value: uniqueCount, label: "سؤال فريد" },
          { value: totalRepetitions, label: "إجمالي التكرارات" },
          { value: `${answeredCount}/${uniqueCount}`, label: "أسئلة مُجابة", highlight: true },
        ].map((s, i) => (
          <Card
            key={i}
            className={`transition-all duration-300 ease-out animate-fade-in-up rounded-2xl ${cardBase}`}
            style={{ animationDelay: `${0.1 + i * 0.08}s`, opacity: 0 }}
          >
            <CardContent className="p-6 text-center">
              {isLoading ? (
                <Skeleton className="h-9 w-16 mx-auto mb-2" />
              ) : (
                <p className={`text-3xl font-bold ${s.highlight ? "text-primary" : "text-foreground"} ${isDark && s.highlight ? "glow-text" : ""}`}>
                  {s.value}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Questions list */}
      <Card
        className={`transition-all duration-300 ease-out animate-fade-in-up rounded-2xl ${cardBase}`}
        style={{ animationDelay: "0.35s", opacity: 0 }}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className={`text-lg font-bold ${isDark ? "text-primary glow-text" : "text-foreground"}`}>
            الأسئلة الأكثر تكرارًا
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => refetch()} className="h-8 w-8">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : !questions?.length ? (
            <p className="text-center text-muted-foreground py-8">لا توجد أسئلة مسجلة بعد</p>
          ) : (
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div
                  key={q.question_hash}
                  className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 ease-out ${questionRowBase}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-lg font-bold w-7 text-center shrink-0 ${
                      isDark ? "text-muted-foreground/50" : "text-muted-foreground/40"
                    }`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{q.question}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${getCategoryColor(q.category || "عام")}`}>
                          {q.category || "عام"}
                        </span>
                        <Badge variant={q.answered ? "default" : "secondary"} className="text-xs">
                          {q.answered ? "مُجاب" : "بدون إجابة"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <span className={`text-sm font-extrabold whitespace-nowrap mr-3 px-3 py-1 rounded-full ${
                    isDark ? "text-primary bg-primary/15 glow-text" : "text-primary bg-primary/10"
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

export default AdminFAQ;
