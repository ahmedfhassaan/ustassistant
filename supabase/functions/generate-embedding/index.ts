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

    // Truncate texts to avoid token limits
    const truncatedTexts = texts.map((t: string) => t.slice(0, 2000));

    // Use the real /v1/embeddings endpoint for proper semantic vectors
    const response = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/text-embedding-004",
        input: truncatedTexts,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Embeddings API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: `Embeddings API error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Extract embeddings from OpenAI-compatible response format
    // Response: { data: [{ embedding: number[], index: number }, ...] }
    const embeddings: number[][] = [];
    
    if (data.data && Array.isArray(data.data)) {
      // Sort by index to maintain order
      const sorted = data.data.sort((a: any, b: any) => a.index - b.index);
      for (const item of sorted) {
        if (item.embedding && Array.isArray(item.embedding)) {
          embeddings.push(item.embedding);
        } else {
          embeddings.push(new Array(768).fill(0));
        }
      }
    } else {
      console.error("Unexpected embeddings response format:", JSON.stringify(data).slice(0, 500));
      // Return zero vectors as fallback
      for (let i = 0; i < truncatedTexts.length; i++) {
        embeddings.push(new Array(768).fill(0));
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
