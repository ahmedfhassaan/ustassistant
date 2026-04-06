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
    const { document_id, content_text } = await req.json();

    if (!document_id) {
      return new Response(
        JSON.stringify({ error: "document_id مطلوب" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const text = content_text || "";

    if (!text.trim()) {
      await supabase
        .from("knowledge_documents")
        .update({ status: "error" })
        .eq("id", document_id);
      return new Response(
        JSON.stringify({ error: "لم يتم استخراج أي نص من المستند" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const chunks = splitIntoChunks(text, 600, 80);

    const chunkRows = chunks.map((content, index) => ({
      document_id,
      content,
      chunk_index: index,
    }));

    const { error: insertError } = await supabase
      .from("knowledge_chunks")
      .insert(chunkRows);

    if (insertError) {
      throw new Error("فشل حفظ الأجزاء: " + insertError.message);
    }

    await supabase
      .from("knowledge_documents")
      .update({ status: "processed" })
      .eq("id", document_id);

    return new Response(
      JSON.stringify({ success: true, chunks_count: chunks.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("process-document error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Word-based chunking with overlap.
 * Target: ~600 words per chunk with 80-word overlap for context continuity.
 * Respects paragraph boundaries when possible.
 */
function splitIntoChunks(text: string, targetWords: number, overlapWords: number): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  
  let currentWords: string[] = [];
  
  for (const para of paragraphs) {
    const paraWords = para.split(/\s+/).filter(Boolean);
    
    if (currentWords.length + paraWords.length > targetWords && currentWords.length > 0) {
      chunks.push(currentWords.join(" "));
      currentWords = currentWords.slice(-overlapWords);
    }
    
    currentWords.push(...paraWords);
    
    while (currentWords.length > targetWords * 1.5) {
      const chunk = currentWords.slice(0, targetWords);
      chunks.push(chunk.join(" "));
      currentWords = currentWords.slice(targetWords - overlapWords);
    }
  }
  
  if (currentWords.length > 0) {
    chunks.push(currentWords.join(" "));
  }
  
  if (chunks.length === 0 && text.trim()) {
    const allWords = text.trim().split(/\s+/);
    for (let i = 0; i < allWords.length; i += targetWords - overlapWords) {
      const chunk = allWords.slice(i, i + targetWords);
      if (chunk.length > 0) chunks.push(chunk.join(" "));
    }
  }
  
  return chunks;
}
