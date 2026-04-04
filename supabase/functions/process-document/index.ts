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
      // Direct text content
      text = content_text;
    } else if (file_path) {
      // Download file from storage
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
        // For PDFs, use the AI to extract text
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY غير مهيأ");

        // Convert PDF to base64 for the AI to process
        const arrayBuffer = await data.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

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

        const aiData = await aiResp.json();
        text = aiData.choices?.[0]?.message?.content || "";
      } else {
        // Try reading as text
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

    // Split text into chunks (approximately 500 chars each with overlap)
    const chunks = splitIntoChunks(text, 500, 50);

    // Insert chunks
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

    // Update document status
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

function splitIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  // Split by paragraphs first
  const paragraphs = text.split(/\n\s*\n/);
  let current = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if ((current + "\n" + trimmed).length > chunkSize && current) {
      chunks.push(current.trim());
      // Keep overlap from end of current chunk
      const words = current.split(/\s+/);
      const overlapWords = words.slice(-Math.floor(overlap / 5));
      current = overlapWords.join(" ") + "\n" + trimmed;
    } else {
      current += (current ? "\n" : "") + trimmed;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  // If no chunks were created (single block of text), force split
  if (chunks.length === 0 && text.trim()) {
    const words = text.trim().split(/\s+/);
    let chunk = "";
    for (const word of words) {
      if ((chunk + " " + word).length > chunkSize && chunk) {
        chunks.push(chunk.trim());
        chunk = word;
      } else {
        chunk += (chunk ? " " : "") + word;
      }
    }
    if (chunk.trim()) chunks.push(chunk.trim());
  }

  return chunks;
}
