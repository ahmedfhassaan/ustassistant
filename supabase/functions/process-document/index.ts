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
    const { document_id, file_path, content_text } = await req.json();

    if (!document_id) {
      return new Response(
        JSON.stringify({ error: "document_id مطلوب" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let text = "";

    if (content_text) {
      text = content_text;
    } else if (file_path) {
      const { data, error } = await supabase.storage
        .from("knowledge")
        .download(file_path);

      if (error || !data) {
        throw new Error("فشل تحميل الملف: " + (error?.message || ""));
      }

      const fileName = file_path.toLowerCase();
      if (fileName.endsWith(".txt") || fileName.endsWith(".md") || fileName.endsWith(".csv")) {
        text = await data.text();
      } else if (fileName.endsWith(".pdf")) {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY غير مهيأ");

        const arrayBuffer = await data.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        const chunkLen = 8192;
        for (let i = 0; i < bytes.length; i += chunkLen) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunkLen));
        }
        const base64 = btoa(binary);

        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "استخرج كل النص الموجود في هذا المستند PDF بالكامل. أعد النص فقط بدون أي تعليقات أو تنسيق إضافي. حافظ على ترتيب المحتوى كما هو."
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:application/pdf;base64,${base64}`
                    }
                  }
                ]
              }
            ],
          }),
        });

        if (!aiResp.ok) {
          const errText = await aiResp.text();
          console.error("AI extraction error:", errText);
          throw new Error("فشل استخراج النص من PDF");
        }

        const respText = await aiResp.text();
        let aiData: any;
        try {
          aiData = JSON.parse(respText);
        } catch {
          console.error("Failed to parse AI response, length:", respText.length);
          const contentMatch = respText.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"/);
          if (contentMatch) {
            text = contentMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
          } else {
            throw new Error("فشل تحليل استجابة AI لاستخراج النص");
          }
        }
        if (!text && aiData) {
          text = aiData.choices?.[0]?.message?.content || "";
        }
      } else {
        text = await data.text();
      }
    }

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

    // Split text into word-based chunks (500-1000 words with 50-word overlap)
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
    
    // If adding this paragraph exceeds target and we have content, flush
    if (currentWords.length + paraWords.length > targetWords && currentWords.length > 0) {
      chunks.push(currentWords.join(" "));
      // Keep overlap words from the end
      currentWords = currentWords.slice(-overlapWords);
    }
    
    currentWords.push(...paraWords);
    
    // If current chunk is very large, force split
    while (currentWords.length > targetWords * 1.5) {
      const chunk = currentWords.slice(0, targetWords);
      chunks.push(chunk.join(" "));
      currentWords = currentWords.slice(targetWords - overlapWords);
    }
  }
  
  // Flush remaining
  if (currentWords.length > 0) {
    chunks.push(currentWords.join(" "));
  }
  
  // If no chunks, force split the raw text
  if (chunks.length === 0 && text.trim()) {
    const allWords = text.trim().split(/\s+/);
    for (let i = 0; i < allWords.length; i += targetWords - overlapWords) {
      const chunk = allWords.slice(i, i + targetWords);
      if (chunk.length > 0) chunks.push(chunk.join(" "));
    }
  }
  
  return chunks;
}
