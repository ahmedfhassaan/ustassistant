import { useState, useEffect } from "react";
import { Settings, User, MessageSquare, Database, Shield, Cpu, Save, Trash2, Loader2, Eye, EyeOff, Search } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useSettings, AssistantSettings } from "@/hooks/use-settings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const toneOptions = [
  { value: "professional", label: "رسمية" },
  { value: "friendly", label: "ودية" },
  { value: "concise", label: "مختصرة" },
  { value: "academic", label: "أكاديمية" },
];

const modelOptions = [
  { value: "gemini-3-flash-preview", label: "Gemini 3 Flash (سريع)" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (متوازن)" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro (متقدم)" },
];

const AdminSettings = () => {
  const { isDark } = useTheme();
  const { settings, loading, saveSettings } = useSettings();
  const [form, setForm] = useState<AssistantSettings>(settings);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  useEffect(() => {
    if (!loading) {
      setForm(settings);
      setDirty(false);
    }
  }, [settings, loading]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings(form);
      setDirty(false);
      toast.success("تم حفظ الإعدادات بنجاح");
    } catch {
      toast.error("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      const { error } = await supabase.from("response_cache").delete().gte("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      toast.success("تم مسح التخزين المؤقت بنجاح");
    } catch {
      toast.error("حدث خطأ أثناء مسح التخزين المؤقت");
    } finally {
      setClearingCache(false);
    }
  };

  const cardBase = isDark
    ? "glass-card rounded-2xl p-6 transition-all duration-300"
    : "bg-white rounded-2xl p-6 border border-black/5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all duration-300";

  const sectionTitle = "text-lg font-bold text-foreground mb-4 flex items-center gap-2";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className={`text-2xl font-bold text-foreground ${isDark ? "glow-text" : ""}`}>
            إعدادات المساعد
          </h1>
          <p className="text-muted-foreground text-sm mt-1">تحكم كامل في سلوك المساعد الذكي</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="gap-2 w-full sm:w-auto"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          حفظ الإعدادات
        </Button>
      </div>

      {dirty && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 rounded-xl px-4 py-2 text-sm">
          ⚠️ لديك تعديلات غير محفوظة
        </div>
      )}

      <Tabs defaultValue="personality" className="space-y-4">
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full h-auto">
          <TabsTrigger value="personality" className="text-[11px] sm:text-sm gap-1 py-2">
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> الشخصية
          </TabsTrigger>
          <TabsTrigger value="responses" className="text-[11px] sm:text-sm gap-1 py-2">
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> الردود
          </TabsTrigger>
          <TabsTrigger value="cache" className="text-[11px] sm:text-sm gap-1 py-2">
            <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> الكاش
          </TabsTrigger>
          <TabsTrigger value="security" className="text-[11px] sm:text-sm gap-1 py-2">
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> الأمان
          </TabsTrigger>
          <TabsTrigger value="ai" className="text-[11px] sm:text-sm gap-1 py-2">
            <Cpu className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> الذكاء
          </TabsTrigger>
          <TabsTrigger value="rag" className="text-[11px] sm:text-sm gap-1 py-2">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> RAG
          </TabsTrigger>
        </TabsList>

        {/* Personality Tab */}
        <TabsContent value="personality" className="space-y-4">
          <div className={cardBase}>
            <h2 className={sectionTitle}>
              <User className="w-5 h-5 text-primary" /> إعدادات شخصية المساعد
            </h2>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>اسم المساعد</Label>
                <Input
                  value={form.assistant_name}
                  onChange={(e) => update("assistant_name", e.target.value)}
                  placeholder="المساعد الجامعي الذكي"
                />
              </div>
              <div className="space-y-2">
                <Label>رسالة الترحيب</Label>
                <Textarea
                  value={form.welcome_message}
                  onChange={(e) => update("welcome_message", e.target.value)}
                  placeholder="كيف يمكنني مساعدتك اليوم؟"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>نبرة الردود</Label>
                <Select value={form.tone} onValueChange={(v) => update("tone", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {toneOptions.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Responses Tab */}
        <TabsContent value="responses" className="space-y-4">
          <div className={cardBase}>
            <h2 className={sectionTitle}>
              <MessageSquare className="w-5 h-5 text-primary" /> التحكم في الردود
            </h2>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>الحد الأقصى لطول الإجابة (كلمة)</Label>
                <Input
                  type="number"
                  value={form.max_response_length}
                  onChange={(e) => update("max_response_length", e.target.value)}
                  min={50}
                  max={5000}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>عرض المصادر مع كل إجابة</Label>
                <Switch
                  checked={form.show_sources === "true"}
                  onCheckedChange={(v) => update("show_sources", v ? "true" : "false")}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>منع الإجابة بدون مصدر موثوق</Label>
                <Switch
                  checked={form.strict_sources === "true"}
                  onCheckedChange={(v) => update("strict_sources", v ? "true" : "false")}
                />
              </div>
              <div className="space-y-2">
                <Label>رسالة عدم وجود إجابة</Label>
                <Textarea
                  value={form.fallback_message}
                  onChange={(e) => update("fallback_message", e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Cache Tab */}
        <TabsContent value="cache" className="space-y-4">
          <div className={cardBase}>
            <h2 className={sectionTitle}>
              <Database className="w-5 h-5 text-primary" /> التخزين المؤقت
            </h2>
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <Label>تفعيل التخزين المؤقت</Label>
                <Switch
                  checked={form.cache_enabled === "true"}
                  onCheckedChange={(v) => update("cache_enabled", v ? "true" : "false")}
                />
              </div>
              <div className="space-y-2">
                <Label>مدة صلاحية الكاش (بالدقائق)</Label>
                <Input
                  type="number"
                  value={form.cache_ttl_minutes}
                  onChange={(e) => update("cache_ttl_minutes", e.target.value)}
                  min={1}
                  max={10080}
                />
                <p className="text-xs text-muted-foreground">
                  {Math.floor(Number(form.cache_ttl_minutes) / 60)} ساعة و {Number(form.cache_ttl_minutes) % 60} دقيقة
                </p>
              </div>
              <div className="flex items-center justify-between">
                <Label>مسح الكاش تلقائياً عند تحديث قاعدة المعرفة</Label>
                <Switch
                  checked={form.auto_clear_cache === "true"}
                  onCheckedChange={(v) => update("auto_clear_cache", v ? "true" : "false")}
                />
              </div>
              <Button
                variant="destructive"
                onClick={handleClearCache}
                disabled={clearingCache}
                className="gap-2"
              >
                {clearingCache ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                مسح التخزين المؤقت يدوياً
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <div className={cardBase}>
            <h2 className={sectionTitle}>
              <Shield className="w-5 h-5 text-primary" /> الأمان
            </h2>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>الرقم الجامعي للمشرف</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={form.admin_student_id}
                  onChange={(e) => update("admin_student_id", e.target.value.replace(/\D/g, ""))}
                  placeholder="20260000"
                />
                <p className="text-xs text-muted-foreground">
                  الرقم الجامعي المستخدم لدخول لوحة التحكم
                </p>
              </div>
              <div className="space-y-2">
                <Label>كلمة مرور المشرف</Label>
                <div className="relative">
                  <Input
                    type={showAdminPassword ? "text" : "password"}
                    value={form.admin_password}
                    onChange={(e) => update("admin_password", e.target.value)}
                    className="pl-10"
                  />
                  <button type="button" onClick={() => setShowAdminPassword(!showAdminPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>الحد الأقصى للرسائل لكل مستخدم يومياً</Label>
                <Input
                  type="number"
                  value={form.max_messages_per_day}
                  onChange={(e) => update("max_messages_per_day", e.target.value)}
                  min={1}
                  max={1000}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>حماية من الاستخدام المفرط</Label>
                <Switch
                  checked={form.abuse_protection === "true"}
                  onCheckedChange={(v) => update("abuse_protection", v ? "true" : "false")}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* AI Tab */}
        <TabsContent value="ai" className="space-y-4">
          <div className={cardBase}>
            <h2 className={sectionTitle}>
              <Cpu className="w-5 h-5 text-primary" /> الأداء والذكاء الاصطناعي
            </h2>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>عدد نتائج البحث قبل توليد الإجابة</Label>
                <Input
                  type="number"
                  value={form.search_results_count}
                  onChange={(e) => update("search_results_count", e.target.value)}
                  min={1}
                  max={20}
                />
              </div>
              <div className="space-y-2">
                <Label>نموذج الذكاء الاصطناعي</Label>
                <Select value={form.ai_model} onValueChange={(v) => update("ai_model", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {modelOptions.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>حد الثقة (%) — {form.confidence_threshold}%</Label>
                <Slider
                  value={[Number(form.confidence_threshold)]}
                  onValueChange={([v]) => update("confidence_threshold", String(v))}
                  min={0}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  إذا كانت درجة الصلة أقل من {form.confidence_threshold}%، يعرض النظام رسالة عدم التأكد
                </p>
              </div>
              <div className="space-y-2">
                <Label>رسالة الثقة المنخفضة</Label>
                <Textarea
                  value={form.low_confidence_message}
                  onChange={(e) => update("low_confidence_message", e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>تعليمات مخصصة</Label>
                <Textarea
                  value={form.custom_instruction}
                  onChange={(e) => update("custom_instruction", e.target.value)}
                  placeholder="أضف تعليمات إضافية للمساعد، مثل: أنت مختص بكلية الهندسة فقط..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  هذه التعليمات تُضاف تلقائياً إلى نظام المساعد وتؤثر على جميع الردود
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* RAG Tab */}
        <TabsContent value="rag" className="space-y-4">
          <div className={cardBase}>
            <h2 className={sectionTitle}>
              <Search className="w-5 h-5 text-primary" /> إعدادات نظام الاسترجاع (RAG)
            </h2>
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>حجم الجزء (chunk_size) — كلمات</Label>
                  <Input type="number" value={form.chunk_size} onChange={(e) => update("chunk_size", e.target.value)} min={80} max={800} />
                  <p className="text-xs text-muted-foreground">يُطبَّق عند رفع مستندات جديدة فقط</p>
                </div>
                <div className="space-y-2">
                  <Label>التداخل بين الأجزاء (overlap)</Label>
                  <Input type="number" value={form.chunk_overlap} onChange={(e) => update("chunk_overlap", e.target.value)} min={0} max={200} />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>إعادة صياغة السؤال (Query Rewriting)</Label>
                  <p className="text-xs text-muted-foreground mt-1">يحوّل السؤال إلى كلمات مفتاحية بحثية قبل البحث</p>
                </div>
                <Switch checked={form.enable_query_rewriting === "true"} onCheckedChange={(v) => update("enable_query_rewriting", v ? "true" : "false")} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>إعادة الترتيب (Reranking)</Label>
                  <p className="text-xs text-muted-foreground mt-1">يجلب نتائج إضافية ثم يختار الأفضل</p>
                </div>
                <Switch checked={form.enable_reranking === "true"} onCheckedChange={(v) => update("enable_reranking", v ? "true" : "false")} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>عدد النتائج الأولية</Label>
                  <Input type="number" value={form.initial_results_count} onChange={(e) => update("initial_results_count", e.target.value)} min={5} max={30} />
                </div>
                <div className="space-y-2">
                  <Label>عدد النتائج النهائية</Label>
                  <Input type="number" value={form.final_results_count} onChange={(e) => update("final_results_count", e.target.value)} min={1} max={15} />
                </div>
              </div>

              <div className="border-t border-foreground/10 pt-4 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">أوزان البحث الهجين</h3>

                <div className="space-y-2">
                  <Label>افتراضي — نص: {form.weight_text_default} / دلالي: {(1 - parseFloat(form.weight_text_default || "0.4")).toFixed(2)}</Label>
                  <Slider value={[parseFloat(form.weight_text_default) * 100]} onValueChange={([v]) => { const t = (v / 100).toFixed(2); update("weight_text_default", t); update("weight_semantic_default", (1 - parseFloat(t)).toFixed(2)); }} min={0} max={100} step={5} />
                </div>

                <div className="space-y-2">
                  <Label>أسئلة دقيقة (أرقام/رموز) — نص: {form.weight_text_exact}</Label>
                  <Slider value={[parseFloat(form.weight_text_exact) * 100]} onValueChange={([v]) => update("weight_text_exact", (v / 100).toFixed(2))} min={0} max={100} step={5} />
                </div>

                <div className="space-y-2">
                  <Label>أسئلة عامة (دلالية) — نص: {form.weight_text_semantic_lean}</Label>
                  <Slider value={[parseFloat(form.weight_text_semantic_lean) * 100]} onValueChange={([v]) => update("weight_text_semantic_lean", (v / 100).toFixed(2))} min={0} max={100} step={5} />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
