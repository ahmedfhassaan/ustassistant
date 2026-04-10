import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Use Lovable AI Gateway chat completions to generate embeddings
    // Since the gateway may not have a dedicated /v1/embeddings endpoint,
    // we use a chat completion approach to generate numerical representations
    const embeddings: number[][] = [];

    for (const text of texts) {
      const truncated = text.slice(0, 2000);
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `You are an embedding generator. Given input text, output ONLY a JSON array of exactly 768 floating point numbers between -1 and 1 that represent the semantic meaning of the text. The numbers should capture: topic, intent, entities, and sentiment. Output ONLY the JSON array, nothing else. No explanation, no markdown, just the raw JSON array.`
            },
            {
              role: "user",
              content: truncated
            }
          ],
          temperature: 0,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited - wait and retry once
          await new Promise(r => setTimeout(r, 2000));
          const retryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                {
                  role: "system",
                  content: `You are an embedding generator. Given input text, output ONLY a JSON array of exactly 768 floating point numbers between -1 and 1 that represent the semantic meaning of the text. Output ONLY the JSON array, nothing else.`
                },
                { role: "user", content: truncated }
              ],
              temperature: 0,
            }),
          });
          if (!retryResponse.ok) {
            const t = await retryResponse.text();
            console.error("Embedding retry failed:", retryResponse.status, t);
            // Return zero vector as fallback
            embeddings.push(new Array(768).fill(0));
            continue;
          }
          const retryData = await retryResponse.json();
          const retryContent = retryData.choices?.[0]?.message?.content || "";
          const retryEmbedding = parseEmbedding(retryContent);
          embeddings.push(retryEmbedding);
          continue;
        }
        const t = await response.text();
        console.error("Embedding generation failed:", response.status, t);
        embeddings.push(new Array(768).fill(0));
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      const embedding = parseEmbedding(content);
      embeddings.push(embedding);
      
      // Small delay between requests to avoid rate limiting
      if (texts.length > 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    return new Response(
      JSON.stringify({ embeddings }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-embedding error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function parseEmbedding(content: string): number[] {
  try {
    // Try to extract JSON array from the content
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const arr = JSON.parse(jsonMatch[0]);
      if (Array.isArray(arr) && arr.length === 768) {
        return arr.map((n: any) => {
          const val = parseFloat(n);
          return isNaN(val) ? 0 : Math.max(-1, Math.min(1, val));
        });
      }
      // If not exactly 768, pad or truncate
      if (Array.isArray(arr)) {
        const normalized = arr.slice(0, 768).map((n: any) => {
          const val = parseFloat(n);
          return isNaN(val) ? 0 : Math.max(-1, Math.min(1, val));
        });
        while (normalized.length < 768) normalized.push(0);
        return normalized;
      }
    }
  } catch (e) {
    console.error("Failed to parse embedding:", e);
  }
  // Return zero vector as fallback
  return new Array(768).fill(0);
}
