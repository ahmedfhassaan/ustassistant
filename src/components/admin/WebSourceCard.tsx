import { useEffect, useState } from "react";
import { Globe, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const KEYS = [
  "web_crawl_root_url",
  "live_search_enabled",
  "live_search_max_results",
  "live_search_timeout_ms",
];

const WebSourceCard = ({ onChanged: _onChanged }: { onChanged?: () => void }) => {
  const { isDark } = useTheme();
  const [rootUrl, setRootUrl] = useState("https://www.ust.edu");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Live search state
  const [liveEnabled, setLiveEnabled] = useState(false);
  const [liveMax, setLiveMax] = useState(4);
  const [liveTimeout, setLiveTimeout] = useState(12000);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("assistant_settings")
        .select("key,value")
        .in("key", KEYS);
      if (data) {
        for (const r of data as any[]) {
          if (r.key === "web_crawl_root_url" && r.value) setRootUrl(r.value);
          if (r.key === "live_search_enabled") setLiveEnabled(r.value === "true");
          if (r.key === "live_search_max_results") setLiveMax(parseInt(r.value) || 4);
          if (r.key === "live_search_timeout_ms") setLiveTimeout(parseInt(r.value) || 12000);
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
      await upsert("web_crawl_root_url", rootUrl.trim());
      await upsert("live_search_enabled", liveEnabled ? "true" : "false");
      await upsert("live_search_max_results", String(Math.max(1, Math.min(8, liveMax))));
      await upsert("live_search_timeout_ms", String(Math.max(3000, Math.min(30000, liveTimeout))));
      toast({ title: "تم حفظ الإعدادات" });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      className={`rounded-2xl ${
        isDark ? "glass-card border-0" : "bg-white border border-black/5 shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
      }`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          البحث المباشر في الويب (Google Grounding)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* النطاق المستهدف للبحث في Google */}
            <div className="space-y-2">
              <Label htmlFor="web-url">النطاق المستهدف</Label>
              <Input
                id="web-url"
                dir="ltr"
                value={rootUrl}
                onChange={(e) => setRootUrl(e.target.value)}
                placeholder="https://www.ust.edu"
                className={isDark ? "glass-input" : ""}
              />
              <p className="text-xs text-muted-foreground">
                يُستخدم لتقييد بحث Google Grounding ضمن هذا النطاق فقط.
              </p>
            </div>

            {/* قسم وضع البحث المباشر */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="live-enabled" className="cursor-pointer flex items-center gap-2 font-semibold">
                  <Zap className="w-4 h-4 text-primary" />
                  تفعيل البحث المباشر (Google Grounding)
                </Label>
                <span dir="ltr" className="inline-flex">
                  <Switch id="live-enabled" checked={liveEnabled} onCheckedChange={setLiveEnabled} />
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                عند التفعيل، إذا لم تكفِ المستندات المرفوعة للإجابة، يبحث المساعد لحظياً في موقع الجامعة عبر Google Grounding ويُرفق المصادر تلقائياً.
              </p>

              {liveEnabled && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <Label htmlFor="live-max" className="text-xs">عدد النتائج (1–8)</Label>
                    <Input
                      id="live-max"
                      type="number"
                      min={1}
                      max={8}
                      value={liveMax}
                      onChange={(e) => setLiveMax(parseInt(e.target.value) || 4)}
                      className={isDark ? "glass-input" : ""}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="live-timeout" className="text-xs">زمن الانتظار (ms)</Label>
                    <Input
                      id="live-timeout"
                      type="number"
                      min={3000}
                      max={30000}
                      step={1000}
                      value={liveTimeout}
                      onChange={(e) => setLiveTimeout(parseInt(e.target.value) || 12000)}
                      className={isDark ? "glass-input" : ""}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-black/5 dark:border-white/5">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                حفظ الإعدادات
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WebSourceCard;
