import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { texts } = await req.json();

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return new Response(
        JSON.stringify({ error: "texts array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Truncate texts to 2000 chars each
    const truncatedTexts = texts.map((t: string) => t.slice(0, 2000));
    const timeout = (req.headers.get("x-timeout") === "long") ? 15000 : 3000;

    console.log(`[generate-embedding] Processing ${truncatedTexts.length} texts, timeout=${timeout}ms`);

    // Use Lovable AI Gateway embeddings endpoint
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/text-embedding-004",
          input: truncatedTexts,
          dimensions: 768,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          const sorted = data.data.sort((a: any, b: any) => a.index - b.index);
          const embeddings = sorted.map((item: any) =>
            item.embedding && Array.isArray(item.embedding)
              ? item.embedding
              : null
          );
          const elapsed = Date.now() - startTime;
          console.log(`[generate-embedding] Success: ${embeddings.filter(Boolean).length}/${truncatedTexts.length} embeddings in ${elapsed}ms`);
          return new Response(
            JSON.stringify({ embeddings }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // If response not ok, log and return nulls
      const errorText = await response.text().catch(() => "unknown");
      console.error(`[generate-embedding] Gateway returned ${response.status}: ${errorText.slice(0, 200)}`);
      const elapsed = Date.now() - startTime;
      console.log(`[generate-embedding] Failed after ${elapsed}ms`);
      return new Response(
        JSON.stringify({ embeddings: truncatedTexts.map(() => null) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (e) {
      clearTimeout(timer);
      const elapsed = Date.now() - startTime;
      const reason = e instanceof Error && e.name === "AbortError" ? "timeout" : (e instanceof Error ? e.message : "unknown");
      console.error(`[generate-embedding] Failed after ${elapsed}ms: ${reason}`);
      return new Response(
        JSON.stringify({ embeddings: truncatedTexts.map(() => null) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (e) {
    const elapsed = Date.now() - startTime;
    console.error(`[generate-embedding] Error after ${elapsed}ms:`, e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
