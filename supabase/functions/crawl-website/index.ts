import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v2";

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getSetting(supabase: any, key: string, fallback = ""): Promise<string> {
  const { data } = await supabase
    .from("assistant_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return (data?.value ?? fallback) as string;
}

async function setSetting(supabase: any, key: string, value: string) {
  const { data: existing } = await supabase
    .from("assistant_settings")
    .select("id")
    .eq("key", key)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("assistant_settings")
      .update({ value, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("assistant_settings").insert({ key, value });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  const supabase = createClient(supabaseUrl, supabaseKey);

  if (!firecrawlKey) {
    return new Response(
      JSON.stringify({ error: "FIRECRAWL_API_KEY غير مهيأ" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Parse request and validate BEFORE backgrounding so we can return errors
  const body = await req.json().catch(() => ({}));
  const enabled = (await getSetting(supabase, "web_crawl_enabled", "true")) === "true";
  const liveMode = (await getSetting(supabase, "live_search_enabled", "false")) === "true";
  if (liveMode && !body?.force) {
    await setSetting(supabase, "web_crawl_last_status", "skipped (live search mode)");
    return new Response(
      JSON.stringify({ skipped: true, reason: "live_search_enabled" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (!enabled && !body?.force) {
    return new Response(
      JSON.stringify({ error: "زحف الويب معطّل في الإعدادات" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const rootUrl = body?.url || (await getSetting(supabase, "web_crawl_root_url", "https://www.ust.edu"));
  const limit = Math.min(Math.max(parseInt(body?.limit ?? "300"), 1), 1000);

  // Long-running work executed in background — survives after we return
  const runCrawl = async () => {
    try {
      console.log(`[crawl-website] Starting crawl of ${rootUrl} (limit=${limit})`);
      await setSetting(supabase, "web_crawl_last_status", "running");
      await setSetting(supabase, "web_crawl_last_run_at", new Date().toISOString());

      const startRes = await fetch(`${FIRECRAWL_BASE}/crawl`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: rootUrl,
          limit,
          scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
        }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) {
        throw new Error(`Firecrawl start failed: ${JSON.stringify(startData)}`);
      }
      const jobId = startData.id || startData.jobId;
      if (!jobId) throw new Error("Firecrawl did not return job id");

      let status: any = null;
      const startTime = Date.now();
      const MAX_MS = 20 * 60 * 1000;
      while (Date.now() - startTime < MAX_MS) {
        await new Promise((r) => setTimeout(r, 5000));
        const sRes = await fetch(`${FIRECRAWL_BASE}/crawl/${jobId}`, {
          headers: { Authorization: `Bearer ${firecrawlKey}` },
        });
        status = await sRes.json();
        console.log(`[crawl-website] status=${status.status} completed=${status.completed}/${status.total}`);
        if (status.status === "completed" || status.status === "failed" || status.status === "cancelled") break;
      }

      if (!status || status.status !== "completed") {
        throw new Error(`Crawl did not complete: ${status?.status || "timeout"}`);
      }

      const pages: Array<{ markdown?: string; metadata?: any }> = status.data || [];
      console.log(`[crawl-website] Received ${pages.length} pages`);

      let added = 0, updated = 0, skipped = 0, failed = 0;

      for (const page of pages) {
        const md = (page.markdown || "").trim();
        const url: string = page.metadata?.sourceURL || page.metadata?.url || "";
        const title: string = (page.metadata?.title || page.metadata?.ogTitle || url || "صفحة").toString().trim();

        if (!md || !url || md.length < 80) { skipped++; continue; }

        try {
          const hash = await sha256(md);
          const docName = `${title} — ${url}`;

          const { data: existing } = await supabase
            .from("knowledge_documents")
            .select("id, content_hash")
            .eq("source_url", url)
            .maybeSingle();

          if (existing && existing.content_hash === hash) {
            await supabase
              .from("knowledge_documents")
              .update({ last_crawled_at: new Date().toISOString() })
              .eq("id", existing.id);
            skipped++;
            continue;
          }

          let docId: string;
          if (existing) {
            docId = existing.id;
            await supabase
              .from("knowledge_documents")
              .update({
                name: docName,
                status: "processing",
                file_size: md.length,
                content_hash: hash,
                last_crawled_at: new Date().toISOString(),
              })
              .eq("id", docId);
            updated++;
          } else {
            const { data: newDoc, error: insErr } = await supabase
              .from("knowledge_documents")
              .insert({
                name: docName,
                file_type: "web",
                file_size: md.length,
                status: "processing",
                source_url: url,
                source_type: "web",
                content_hash: hash,
                last_crawled_at: new Date().toISOString(),
              })
              .select("id")
              .single();
            if (insErr || !newDoc) throw new Error(insErr?.message || "insert failed");
            docId = newDoc.id;
            added++;
          }

          const procRes = await fetch(`${supabaseUrl}/functions/v1/process-document`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ document_id: docId, content_text: md }),
          });
          if (!procRes.ok) {
            const errText = await procRes.text();
            console.error(`[crawl-website] process-document failed for ${url}: ${errText}`);
            failed++;
          }
        } catch (e) {
          console.error(`[crawl-website] page failed (${url}):`, e);
          failed++;
        }
      }

      const summary = `added=${added} updated=${updated} skipped=${skipped} failed=${failed}`;
      console.log(`[crawl-website] Done: ${summary}`);
      await setSetting(supabase, "web_crawl_last_run_at", new Date().toISOString());
      await setSetting(supabase, "web_crawl_last_status", `success: ${summary}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطأ غير متوقع";
      console.error("[crawl-website] FATAL:", msg);
      try {
        await setSetting(supabase, "web_crawl_last_status", `failed: ${msg.slice(0, 200)}`);
        await setSetting(supabase, "web_crawl_last_run_at", new Date().toISOString());
      } catch {}
    }
  };

  // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
  EdgeRuntime.waitUntil(runCrawl());

  return new Response(
    JSON.stringify({ success: true, queued: true, message: "بدأ الزحف في الخلفية. سيتم تحديث الحالة تلقائياً." }),
    { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
