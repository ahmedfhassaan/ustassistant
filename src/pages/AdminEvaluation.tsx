import { useState, useEffect } from "react";
import { Beaker, Plus, Play, Trash2, Loader2, CheckCircle, XCircle, Edit, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import EmptyState from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

interface GoldenQuestion {
  id: string;
  question: string;
  expected_keywords: string[];
  expected_sources: string[];
  category: string;
  notes: string | null;
  created_at: string;
}

interface RunSummary {
  run_id: string;
  run_at: string;
  total: number;
  passed: number;
  avg_latency: number;
  avg_keyword_score: number;
  avg_source_score: number;
}

const AdminEvaluation = () => {
  const { isDark } = useTheme();
  const [questions, setQuestions] = useState<GoldenQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runProgress, setRunProgress] = useState({ current: 0, total: 0 });
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newQ, setNewQ] = useState({ question: "", keywords: "", sources: "", category: "عام" });
  const [showAdd, setShowAdd] = useState(false);

  const cardBase = isDark
    ? "glass-card border-0"
    : "bg-white border border-black/5 shadow-[0_4px_20px_rgba(0,0,0,0.08)]";

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: qs }, { data: rs }] = await Promise.all([
      supabase.from("golden_questions").select("*").order("created_at", { ascending: false }),
      supabase.from("evaluation_runs").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    setQuestions((qs as any) || []);

    // Aggregate runs by run_id
    const map = new Map<string, any[]>();
    (rs || []).forEach((r: any) => {
      if (!map.has(r.run_id)) map.set(r.run_id, []);
      map.get(r.run_id)!.push(r);
    });
    const summaries: RunSummary[] = Array.from(map.entries()).map(([run_id, items]) => {
      const passed = items.filter((i: any) => i.passed).length;
      const avg = (key: string) => items.reduce((s: number, i: any) => s + (i[key] || 0), 0) / items.length;
      return {
        run_id,
        run_at: items[0].created_at,
        total: items.length,
        passed,
        avg_latency: Math.round(avg("latency_ms")),
        avg_keyword_score: Math.round(avg("keyword_match_score") * 100),
        avg_source_score: Math.round(avg("source_match_score") * 100),
      };
    }).sort((a, b) => b.run_at.localeCompare(a.run_at)).slice(0, 5);
    setRuns(summaries);
    setLoading(false);
  };

  const addQuestion = async () => {
    if (!newQ.question.trim()) {
      toast.error("السؤال مطلوب");
      return;
    }
    const keywords = newQ.keywords.split(",").map(s => s.trim()).filter(Boolean);
    const sources = newQ.sources.split(",").map(s => s.trim()).filter(Boolean);
    const { error } = await supabase.from("golden_questions").insert({
      question: newQ.question.trim(),
      expected_keywords: keywords,
      expected_sources: sources,
      category: newQ.category || "عام",
    });
    if (error) {
      toast.error("فشل الإضافة: " + error.message);
    } else {
      toast.success("تم الإضافة");
      setNewQ({ question: "", keywords: "", sources: "", category: "عام" });
      setShowAdd(false);
      fetchAll();
    }
  };

  const deleteQuestion = async (id: string) => {
    const { error } = await supabase.from("golden_questions").delete().eq("id", id);
    if (error) toast.error("فشل الحذف");
    else { toast.success("تم الحذف"); fetchAll(); }
  };

  const runEvaluation = async () => {
    if (questions.length === 0) {
      toast.error("أضف أسئلة أولاً");
      return;
    }
    setRunning(true);
    setRunProgress({ current: 0, total: questions.length });
    const runId = crypto.randomUUID();

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      setRunProgress({ current: i + 1, total: questions.length });
      const start = Date.now();
      try {
        const { data, error } = await supabase.functions.invoke("chat", {
          body: { messages: [{ role: "user", content: q.question }], userId: "eval_runner" },
        });
        const latency = Date.now() - start;

        let answer = "";
        let sources = "";
        if (!error && data) {
          // chat function returns either streaming or json
          if (typeof data === "string") {
            answer = data;
          } else if (data.content) {
            answer = data.content;
            sources = data.sources || "";
          }
        }

        // Score keywords
        const lowerAns = answer.toLowerCase();
        const matchedKw = q.expected_keywords.filter(k => lowerAns.includes(k.toLowerCase())).length;
        const kwScore = q.expected_keywords.length > 0 ? matchedKw / q.expected_keywords.length : 1;

        // Score sources
        const matchedSrc = q.expected_sources.filter(s => sources.includes(s)).length;
        const srcScore = q.expected_sources.length > 0 ? matchedSrc / q.expected_sources.length : 1;

        const passed = kwScore >= 0.5 && (q.expected_sources.length === 0 || srcScore >= 0.5);

        await supabase.from("evaluation_runs").insert({
          run_id: runId,
          question_id: q.id,
          question_text: q.question,
          generated_answer: answer.slice(0, 2000),
          generated_sources: sources,
          latency_ms: latency,
          confidence: 0,
          keyword_match_score: kwScore,
          source_match_score: srcScore,
          passed,
          error_message: error ? String(error.message || error) : null,
        });
      } catch (e: any) {
        await supabase.from("evaluation_runs").insert({
          run_id: runId,
          question_id: q.id,
          question_text: q.question,
          latency_ms: Date.now() - start,
          keyword_match_score: 0,
          source_match_score: 0,
          passed: false,
          error_message: String(e?.message || e),
        });
      }
    }

    setRunning(false);
    toast.success("اكتمل التقييم");
    fetchAll();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      <Card className={`rounded-2xl ${cardBase}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Beaker className="w-5 h-5 text-primary" />
            تقييم جودة المساعد (Golden Dataset)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="questions" dir="rtl">
            <TabsList className="mb-4">
              <TabsTrigger value="questions">الأسئلة الذهبية ({questions.length})</TabsTrigger>
              <TabsTrigger value="run">تشغيل التقييم</TabsTrigger>
              <TabsTrigger value="results">النتائج ({runs.length})</TabsTrigger>
            </TabsList>

            {/* TAB 1: Questions */}
            <TabsContent value="questions" className="space-y-3">
              <div className="flex justify-end">
                <Button onClick={() => setShowAdd(s => !s)} size="sm" className="gap-2">
                  {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {showAdd ? "إلغاء" : "إضافة سؤال"}
                </Button>
              </div>

              {showAdd && (
                <Card className={`p-4 space-y-3 ${cardBase}`}>
                  <Textarea
                    placeholder="نص السؤال..."
                    value={newQ.question}
                    onChange={(e) => setNewQ({ ...newQ, question: e.target.value })}
                    dir="rtl"
                  />
                  <Input
                    placeholder="الكلمات المفتاحية المتوقعة (مفصولة بفواصل)"
                    value={newQ.keywords}
                    onChange={(e) => setNewQ({ ...newQ, keywords: e.target.value })}
                    dir="rtl"
                  />
                  <Input
                    placeholder="أسماء المصادر المتوقعة (مفصولة بفواصل، اختياري)"
                    value={newQ.sources}
                    onChange={(e) => setNewQ({ ...newQ, sources: e.target.value })}
                    dir="rtl"
                  />
                  <Input
                    placeholder="الفئة"
                    value={newQ.category}
                    onChange={(e) => setNewQ({ ...newQ, category: e.target.value })}
                    dir="rtl"
                  />
                  <Button onClick={addQuestion} className="gap-2">
                    <Save className="w-4 h-4" /> حفظ
                  </Button>
                </Card>
              )}

              {loading ? (
                <Skeleton className="h-32 rounded-xl" />
              ) : questions.length === 0 ? (
                <EmptyState
                  icon={Beaker}
                  title="لا توجد أسئلة ذهبية بعد"
                  description="أضف أسئلة معيارية بإجاباتها المتوقعة لقياس جودة المساعد بشكل دوري"
                />
              ) : (
                <div className="space-y-2">
                  {questions.map((q) => (
                    <div key={q.id} className={`p-3 rounded-xl border ${isDark ? "bg-white/5 border-white/5" : "bg-secondary/20 border-black/5"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{q.question}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{q.category}</span>
                            {q.expected_keywords.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                كلمات: {q.expected_keywords.join("، ")}
                              </span>
                            )}
                          </div>
                          {q.expected_sources.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              مصادر متوقعة: {q.expected_sources.join("، ")}
                            </p>
                          )}
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => deleteQuestion(q.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB 2: Run */}
            <TabsContent value="run" className="space-y-4">
              <div className="text-center py-6 space-y-4">
                <p className="text-muted-foreground">
                  سيُشغّل التقييم {questions.length} سؤال عبر المساعد ويسجّل النتائج.
                </p>
                <Button
                  size="lg"
                  onClick={runEvaluation}
                  disabled={running || questions.length === 0}
                  className="gap-2"
                >
                  {running ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  {running ? `جاري التقييم... (${runProgress.current}/${runProgress.total})` : "بدء التقييم"}
                </Button>
                {running && (
                  <div className="max-w-md mx-auto">
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${(runProgress.current / runProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 3: Results */}
            <TabsContent value="results" className="space-y-3">
              {runs.length === 0 ? (
                <EmptyState
                  icon={Play}
                  title="لم يتم تشغيل أي تقييم بعد"
                  description="شغّل تقييماً من تبويب 'تشغيل التقييم' لرؤية النتائج هنا"
                />
              ) : (
                <div className="space-y-3">
                  {runs.map((r, idx) => (
                    <Card key={r.run_id} className={`p-4 ${cardBase}`}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {idx === 0 ? "الأحدث · " : ""}{new Date(r.run_at).toLocaleString("ar-SA")}
                          </p>
                          <p className="text-2xl font-bold text-foreground mt-1">
                            {r.passed}/{r.total}{" "}
                            <span className="text-sm font-normal text-muted-foreground">
                              ({Math.round((r.passed / r.total) * 100)}% نجاح)
                            </span>
                          </p>
                        </div>
                        {r.passed === r.total ? (
                          <CheckCircle className="w-6 h-6 text-emerald-500" />
                        ) : (
                          <XCircle className="w-6 h-6 text-amber-500" />
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className={`p-2 rounded ${isDark ? "bg-white/5" : "bg-secondary/30"}`}>
                          <p className="text-muted-foreground text-xs">متوسط الكمون</p>
                          <p className="font-bold">{r.avg_latency} ms</p>
                        </div>
                        <div className={`p-2 rounded ${isDark ? "bg-white/5" : "bg-secondary/30"}`}>
                          <p className="text-muted-foreground text-xs">تطابق الكلمات</p>
                          <p className="font-bold">{r.avg_keyword_score}%</p>
                        </div>
                        <div className={`p-2 rounded ${isDark ? "bg-white/5" : "bg-secondary/30"}`}>
                          <p className="text-muted-foreground text-xs">تطابق المصادر</p>
                          <p className="font-bold">{r.avg_source_score}%</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEvaluation;
