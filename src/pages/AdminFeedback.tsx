import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/use-theme";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";
import { ThumbsDown, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ExportMenu, { type ExportPayload } from "@/components/ExportMenu";

const REASONS = ["الإجابة غير صحيحة", "غير واضحة", "ناقصة", "لا يوجد مصدر", "سبب آخر"];

const AdminFeedback = () => {
  const { isDark } = useTheme();
  const [filterReason, setFilterReason] = useState<string>("all");

  const { data: feedbacks, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_feedback")
        .select("*")
        .eq("is_helpful", false)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const filtered = feedbacks?.filter(
    (f) => filterReason === "all" || f.reason === filterReason
  );

  const reasonCounts = feedbacks?.reduce((acc, f) => {
    const r = f.reason || "غير محدد";
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topReason = reasonCounts
    ? Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0]
    : null;

  const cardBase = isDark
    ? "glass-card border-0"
    : "bg-white border border-black/5 shadow-[0_4px_20px_rgba(0,0,0,0.08)]";

  const rowBase = isDark
    ? "bg-white/5 hover:bg-white/8 border border-white/5"
    : "bg-secondary/30 hover:bg-secondary/60 border border-black/5";

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Card className={`rounded-2xl ${cardBase}`}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className={`p-3 rounded-xl text-destructive ${isDark ? "bg-white/5" : "bg-secondary"}`}>
              <ThumbsDown className="w-6 h-6" />
            </div>
            <div>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <p className={`text-3xl font-bold text-foreground ${isDark ? "glow-text" : ""}`}>
                  {feedbacks?.length ?? 0}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-1">إجمالي التقييمات السلبية</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`rounded-2xl ${cardBase}`}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className={`p-3 rounded-xl text-amber-500 ${isDark ? "bg-white/5" : "bg-secondary"}`}>
              <Filter className="w-6 h-6" />
            </div>
            <div>
              {isLoading ? <Skeleton className="h-8 w-32" /> : (
                <p className={`text-lg font-bold text-foreground ${isDark ? "glow-text" : ""}`}>
                  {topReason ? `${topReason[0]} (${topReason[1]})` : "—"}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-1">أكثر سبب شيوعاً</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter + Table */}
      <Card className={`rounded-2xl ${cardBase}`}>
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className={`text-xl font-bold ${isDark ? "text-primary glow-text" : "text-foreground"}`}>
            التقييمات السلبية
          </CardTitle>
          <Select value={filterReason} onValueChange={setFilterReason}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="فلترة حسب السبب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              {REASONS.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl mb-3" />
            ))
          ) : isError ? (
            <ErrorState message="تعذّر تحميل التقييمات" onRetry={() => refetch()} />
          ) : filtered && filtered.length > 0 ? (
            <div className="space-y-3">
              {filtered.map((f) => (
                <div key={f.id} className={`p-4 rounded-xl transition-all duration-200 ${rowBase}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      isDark ? "bg-destructive/20 text-destructive" : "bg-destructive/10 text-destructive"
                    }`}>
                      {f.reason || "غير محدد"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(f.created_at).toLocaleDateString("ar-SA", {
                        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {f.question_content && (
                    <p className="text-sm text-muted-foreground mb-1">
                      <span className="font-semibold text-foreground/70">السؤال:</span>{" "}
                      {f.question_content.slice(0, 120)}{f.question_content.length > 120 ? "..." : ""}
                    </p>
                  )}
                  <p className="text-sm text-foreground/80 mb-1">
                    <span className="font-semibold text-foreground/70">الإجابة:</span>{" "}
                    {f.message_content.slice(0, 150)}{f.message_content.length > 150 ? "..." : ""}
                  </p>
                  {f.reason === "سبب آخر" && f.reason_other && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold">السبب:</span> {f.reason_other}
                    </p>
                  )}
                  {f.notes && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold">ملاحظات:</span> {f.notes}
                    </p>
                  )}
                  {f.sources && (
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      <span className="font-semibold">المصدر:</span> {f.sources}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ThumbsDown}
              title="لا توجد تقييمات سلبية"
              description="ستظهر هنا التقييمات عندما يقوم المستخدمون بتقييم إجابات المساعد"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFeedback;
