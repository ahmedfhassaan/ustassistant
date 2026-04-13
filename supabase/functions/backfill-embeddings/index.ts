import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all chunks without embeddings
    const { data: chunks, error } = await supabase
      .from("knowledge_chunks")
      .select("id, content")
      .is("embedding", null)
      .order("created_at");

    if (error) throw error;
    if (!chunks || chunks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, failed: 0, message: "No chunks need embeddings" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[backfill] Starting backfill for ${chunks.length} chunks`);

    let processed = 0;
    let failed = 0;
    const BATCH_SIZE = 10;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const texts = batch.map(c => c.content);

      try {
        const embResponse = await fetch(`${supabaseUrl}/functions/v1/generate-embedding`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
            "x-timeout": "long",
          },
          body: JSON.stringify({ texts }),
        });

        if (!embResponse.ok) {
          console.error(`[backfill] Batch ${i / BATCH_SIZE + 1} failed: ${embResponse.status}`);
          failed += batch.length;
          continue;
        }

        const embData = await embResponse.json();
        const embeddings = embData.embeddings || [];

        for (let j = 0; j < batch.length; j++) {
          if (embeddings[j] && Array.isArray(embeddings[j])) {
            const { error: updateError } = await supabase
              .from("knowledge_chunks")
              .update({ embedding: JSON.stringify(embeddings[j]) } as any)
              .eq("id", batch[j].id);

            if (updateError) {
              console.error(`[backfill] Update failed for chunk ${batch[j].id}:`, updateError);
              failed++;
            } else {
              processed++;
            }
          } else {
            failed++;
          }
        }
      } catch (e) {
        console.error(`[backfill] Batch error:`, e);
        failed += batch.length;
      }

      // Small delay between batches
      if (i + BATCH_SIZE < chunks.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    console.log(`[backfill] Done: ${processed} processed, ${failed} failed out of ${chunks.length}`);

    return new Response(
      JSON.stringify({ success: true, total: chunks.length, processed, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[backfill] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
