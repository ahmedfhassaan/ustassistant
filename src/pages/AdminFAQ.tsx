import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

const AdminFAQ = () => {
  const { isDark } = useTheme();

  const { data: questions, isLoading } = useQuery({
    queryKey: ["faq-questions"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_question_stats", { limit_count: 20 });
      if (error) throw error;
      return data || [];
    },
  });

  const totalRepetitions = questions?.reduce((sum, q) => sum + Number(q.count), 0) || 0;
  const uniqueCount = questions?.length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { value: uniqueCount, label: "سؤال فريد" },
          { value: totalRepetitions, label: "إجمالي التكرارات", highlight: true },
        ].map((s, i) => (
          <Card key={i} className={`transition-all duration-300 animate-fade-in-up hover:translate-y-[-2px] ${isDark ? "glass-card border-0" : ""}`} style={{ animationDelay: `${0.1 + i * 0.08}s`, opacity: 0 }}>
            <CardContent className="p-5 text-center">
              <p className={`text-2xl font-bold ${s.highlight ? "text-primary" : "text-foreground"}`}>{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Questions list */}
      <Card className={`transition-all duration-300 animate-fade-in-up ${isDark ? "glass-card border-0" : ""}`} style={{ animationDelay: "0.25s", opacity: 0 }}>
        <CardHeader>
          <CardTitle className="text-lg">الأسئلة الأكثر تكرارًا</CardTitle>
        </CardHeader>
        <CardContent>
          {questions && questions.length > 0 ? (
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
                    <p className="text-sm font-medium text-foreground">{q.question}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary whitespace-nowrap mr-3">
                    {q.count} مرة
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">لا توجد أسئلة مسجلة بعد</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFAQ;
