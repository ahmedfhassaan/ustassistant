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

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      console.error("[generate-embedding] GOOGLE_AI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "GOOGLE_AI_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Truncate texts to 2000 chars each
    const truncatedTexts = texts.map((t: string) => t.slice(0, 2000));
    const timeout = (req.headers.get("x-timeout") === "long") ? 15000 : 3000;

    console.log(`[generate-embedding] Processing ${truncatedTexts.length} texts (avg ${Math.round(truncatedTexts.reduce((s: number, t: string) => s + t.length, 0) / truncatedTexts.length)} chars), timeout=${timeout}ms`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      // Build batch request for Google AI Gemini API
      const requests = truncatedTexts.map((text: string) => ({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text }] },
        outputDimensionality: 768,
      }));

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${GOOGLE_AI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requests }),
          signal: controller.signal,
        }
      );

      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        if (data.embeddings && Array.isArray(data.embeddings)) {
          const embeddings = data.embeddings.map((item: any) =>
            item.values && Array.isArray(item.values) ? item.values : null
          );
          const elapsed = Date.now() - startTime;
          const dims = embeddings[0]?.length || 0;
          console.log(`[generate-embedding] Success: ${embeddings.filter(Boolean).length}/${truncatedTexts.length} embeddings (${dims} dims) in ${elapsed}ms`);
          return new Response(
            JSON.stringify({ embeddings }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // If response not ok
      const errorText = await response.text().catch(() => "unknown");
      const elapsed = Date.now() - startTime;
      console.error(`[generate-embedding] Google AI returned ${response.status}: ${errorText.slice(0, 300)}`);
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
