import { useEffect, useState } from "react";
import { Globe, Loader2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const KEYS = ["web_crawl_enabled", "web_crawl_root_url", "web_crawl_last_run_at", "web_crawl_last_status"];

const WebSourceCard = ({ onChanged }: { onChanged?: () => void }) => {
  const { isDark } = useTheme();
  const [enabled, setEnabled] = useState(true);
  const [rootUrl, setRootUrl] = useState("https://www.ust.edu");
  const [lastRunAt, setLastRunAt] = useState<string>("");
  const [lastStatus, setLastStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("assistant_settings")
        .select("key,value")
        .in("key", KEYS);
      if (data) {
        for (const r of data as any[]) {
          if (r.key === "web_crawl_enabled") setEnabled(r.value === "true");
          if (r.key === "web_crawl_root_url" && r.value) setRootUrl(r.value);
          if (r.key === "web_crawl_last_run_at") setLastRunAt(r.value || "");
          if (r.key === "web_crawl_last_status") setLastStatus(r.value || "");
        }
      }
      setLoading(false);
    })();
  }, []);

  const upsert = async (key: string, value: string) => {
    const { data: existing } = await supabase
      .from("assistant_settings")
      .select("id")
      .eq("key", key)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("assistant_settings")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("id", (existing as any).id);
    } else {
      await supabase.from("assistant_settings").insert({ key, value } as any);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsert("web_crawl_enabled", enabled ? "true" : "false");
      await upsert("web_crawl_root_url", rootUrl.trim());
      toast({ title: "تم حفظ الإعدادات" });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRunNow = async () => {
    if (!rootUrl.trim()) {
      toast({ title: "أدخل رابط الموقع أولاً", variant: "destructive" });
      return;
    }
    setRunning(true);
    toast({ title: "بدأ الزحف", description: "قد يستغرق عدة دقائق..." });
    try {
      const { data, error } = await supabase.functions.invoke("crawl-website", {
        body: { force: true },
      });
      if (error) throw error;
      const r = data as any;
      toast({
        title: "اكتمل الزحف",
        description: `أُضيف ${r?.added ?? 0} | حُدِّث ${r?.updated ?? 0} | تُجاوز ${r?.skipped ?? 0} | فشل ${r?.failed ?? 0}`,
      });
      // Refresh settings
      const { data: s } = await supabase
        .from("assistant_settings")
        .select("key,value")
        .in("key", ["web_crawl_last_run_at", "web_crawl_last_status"]);
      for (const r of (s as any[]) || []) {
        if (r.key === "web_crawl_last_run_at") setLastRunAt(r.value || "");
        if (r.key === "web_crawl_last_status") setLastStatus(r.value || "");
      }
      onChanged?.();
    } catch (e: any) {
      toast({ title: "فشل الزحف", description: e.message || "خطأ", variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const statusOk = lastStatus.startsWith("success");
  const statusBad = lastStatus.startsWith("failed");

  return (
    <Card
      className={`rounded-2xl ${
        isDark ? "glass-card border-0" : "bg-white border border-black/5 shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
      }`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          مصدر الويب — موقع الجامعة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              يتم زحف الموقع وتخزين محتواه ضمن قاعدة المعرفة. الإجابات تستخدمه تلقائياً مع المستندات المرفوعة.
            </p>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-black/5 dark:bg-white/5 dark:border-white/5">
              <Label htmlFor="web-enabled" className="cursor-pointer">تفعيل مصدر الويب</Label>
              <Switch id="web-enabled" checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="web-url">رابط الموقع</Label>
              <Input
                id="web-url"
                dir="ltr"
                value={rootUrl}
                onChange={(e) => setRootUrl(e.target.value)}
                placeholder="https://www.ust.edu"
                className={isDark ? "glass-input" : ""}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {statusOk && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              {statusBad && <AlertCircle className="w-4 h-4 text-destructive" />}
              <span>
                {lastRunAt
                  ? `آخر تحديث: ${new Date(lastRunAt).toLocaleString("ar-SA")}`
                  : "لم يتم التحديث بعد"}
              </span>
              {lastStatus && <span className="opacity-70">— {lastStatus}</span>}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSave} disabled={saving} variant="outline" className="gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                حفظ الإعدادات
              </Button>
              <Button onClick={handleRunNow} disabled={running || !enabled} className="gap-2">
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {running ? "جاري الزحف..." : "تحديث الآن"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WebSourceCard;
