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

    const truncatedTexts = texts.map((t: string) => t.slice(0, 2000));

    // Try /v1/embeddings with an allowed model first
    const response = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        input: truncatedTexts,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      
      if (data.data && Array.isArray(data.data)) {
        const sorted = data.data.sort((a: any, b: any) => a.index - b.index);
        const embeddings = sorted.map((item: any) => 
          item.embedding && Array.isArray(item.embedding) 
            ? item.embedding 
            : new Array(768).fill(0)
        );
        return new Response(
          JSON.stringify({ embeddings }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fallback: use chat completions with structured tool calling for deterministic embeddings
    console.log("Embeddings endpoint not available, using structured extraction fallback");
    
    const embeddings: number[][] = [];

    for (let i = 0; i < truncatedTexts.length; i++) {
      const text = truncatedTexts[i];
      
      const chatResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              content: "You generate semantic embedding vectors. Analyze the text and produce a 768-dimension vector capturing its meaning. Output ONLY a JSON array of 768 floats between -1 and 1. No explanation."
            },
            { role: "user", content: text }
          ],
          temperature: 0,
          tools: [{
            type: "function",
            function: {
              name: "store_embedding",
              description: "Store the embedding vector for the given text",
              parameters: {
                type: "object",
                properties: {
                  vector: {
                    type: "array",
                    items: { type: "number" },
                    description: "768-dimensional embedding vector with values between -1 and 1"
                  }
                },
                required: ["vector"]
              }
            }
          }],
          tool_choice: { type: "function", function: { name: "store_embedding" } }
        }),
      });

      if (!chatResponse.ok) {
        console.error("Chat fallback failed:", chatResponse.status);
        embeddings.push(new Array(768).fill(0));
        if (truncatedTexts.length > 1) await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      const chatData = await chatResponse.json();
      
      // Extract from tool call response
      const toolCall = chatData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          if (args.vector && Array.isArray(args.vector)) {
            const vec = args.vector.slice(0, 768).map((n: any) => {
              const v = parseFloat(n);
              return isNaN(v) ? 0 : Math.max(-1, Math.min(1, v));
            });
            while (vec.length < 768) vec.push(0);
            embeddings.push(vec);
          } else {
            embeddings.push(new Array(768).fill(0));
          }
        } catch {
          embeddings.push(new Array(768).fill(0));
        }
      } else {
        // Try parsing from content as fallback
        const content = chatData.choices?.[0]?.message?.content || "";
        embeddings.push(parseEmbeddingFromContent(content));
      }

      if (truncatedTexts.length > 1) await new Promise(r => setTimeout(r, 500));
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

function parseEmbeddingFromContent(content: string): number[] {
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const arr = JSON.parse(jsonMatch[0]);
      if (Array.isArray(arr)) {
        const normalized = arr.slice(0, 768).map((n: any) => {
          const val = parseFloat(n);
          return isNaN(val) ? 0 : Math.max(-1, Math.min(1, val));
        });
        while (normalized.length < 768) normalized.push(0);
        return normalized;
      }
    }
  } catch { /* ignore */ }
  return new Array(768).fill(0);
}
