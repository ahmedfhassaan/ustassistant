import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function loadChunkSettings(supabase: any): Promise<{ size: number; overlap: number }> {
  let size = 280;
  let overlap = 50;
  try {
    const { data } = await supabase
      .from("assistant_settings")
      .select("key, value")
      .in("key", ["chunk_size", "chunk_overlap"]);
    if (data) {
      for (const row of data) {
        if (row.key === "chunk_size") {
          const v = parseInt(row.value);
          if (!isNaN(v) && v >= 80 && v <= 800) size = v;
        } else if (row.key === "chunk_overlap") {
          const v = parseInt(row.value);
          if (!isNaN(v) && v >= 0 && v <= 200) overlap = v;
        }
      }
    }
  } catch (e) {
    console.warn("[process-document] Failed to load chunk settings, using defaults:", e);
  }
  // Sanity: overlap must be smaller than size
  if (overlap >= size) overlap = Math.floor(size / 5);
  return { size, overlap };
}

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

    const { size: chunkSize, overlap: chunkOverlap } = await loadChunkSettings(supabase);
    console.log(`[process-document] Using chunk_size=${chunkSize} overlap=${chunkOverlap}`);

    const chunks = splitMarkdownAware(text, chunkSize, chunkOverlap);
    console.log(`[process-document] Produced ${chunks.length} chunks`);

    // Generate embeddings for all chunks
    let embeddings: number[][] = [];
    try {
      const embeddingResponse = await fetch(
        `${supabaseUrl}/functions/v1/generate-embedding`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
            "x-timeout": "long",
          },
          body: JSON.stringify({ texts: chunks }),
        }
      );

      if (embeddingResponse.ok) {
        const embData = await embeddingResponse.json();
        embeddings = embData.embeddings || [];
      } else {
        console.error("Embedding generation failed, proceeding without embeddings");
      }
    } catch (e) {
      console.error("Embedding generation error:", e);
    }

    const chunkRows = chunks.map((content, index) => ({
      document_id,
      content,
      chunk_index: index,
      ...(embeddings[index] ? { embedding: JSON.stringify(embeddings[index]) } : {}),
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
      JSON.stringify({
        success: true,
        chunks_count: chunks.length,
        embeddings_count: embeddings.length
      }),
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

// ----------------------------------------------------------------
// Markdown-aware chunking
// - Preserves headings as context prefix on every child chunk
// - Keeps tables and lists intact (does not split them mid-block)
// - Falls back to word-level chunks if a single block exceeds size
// ----------------------------------------------------------------

type Block =
  | { type: "heading"; level: number; text: string; raw: string }
  | { type: "table"; raw: string }
  | { type: "list"; raw: string }
  | { type: "paragraph"; raw: string };

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  const isTableLine = (l: string) => /^\s*\|.*\|\s*$/.test(l);
  const isListLine = (l: string) => /^\s*([-*+]\s+|\d+\.\s+)/.test(l);
  const isHeading = (l: string) => /^#{1,6}\s+/.test(l);
  const isBlank = (l: string) => /^\s*$/.test(l);

  while (i < lines.length) {
    const line = lines[i];

    if (isBlank(line)) { i++; continue; }

    // Heading
    if (isHeading(line)) {
      const m = line.match(/^(#{1,6})\s+(.*)$/);
      if (m) {
        blocks.push({ type: "heading", level: m[1].length, text: m[2].trim(), raw: line.trim() });
        i++;
        continue;
      }
    }

    // Table block: collect contiguous lines starting/ending with |
    if (isTableLine(line)) {
      const start = i;
      while (i < lines.length && isTableLine(lines[i])) i++;
      blocks.push({ type: "table", raw: lines.slice(start, i).join("\n") });
      continue;
    }

    // List block: collect contiguous list lines (and their indented continuations)
    if (isListLine(line)) {
      const start = i;
      while (i < lines.length && (isListLine(lines[i]) || /^\s{2,}\S/.test(lines[i]))) i++;
      blocks.push({ type: "list", raw: lines.slice(start, i).join("\n") });
      continue;
    }

    // Paragraph: collect until blank line or special block start
    const start = i;
    while (
      i < lines.length &&
      !isBlank(lines[i]) &&
      !isHeading(lines[i]) &&
      !isTableLine(lines[i]) &&
      !isListLine(lines[i])
    ) i++;
    blocks.push({ type: "paragraph", raw: lines.slice(start, i).join("\n") });
  }

  return blocks;
}

function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

function buildHeadingPrefix(headings: string[]): string {
  // Keep the last 2 headings (e.g. section + subsection) — short prefix
  const tail = headings.slice(-2).filter(Boolean);
  return tail.length ? tail.join(" — ") + "\n\n" : "";
}

function splitMarkdownAware(markdown: string, targetWords: number, overlapWords: number): string[] {
  const MIN_WORDS = 60;
  const MAX_HARD = Math.floor(targetWords * 1.6);
  const blocks = parseBlocks(markdown);
  const chunks: string[] = [];

  // Track active heading hierarchy (by level)
  const headingStack: string[] = []; // index = level-1
  let buffer = "";
  let bufferWords = 0;
  let activePrefix = "";

  const flush = () => {
    const content = buffer.trim();
    if (content && wordCount(content) >= Math.min(MIN_WORDS, 20)) {
      chunks.push(content);
    } else if (content && chunks.length > 0) {
      // Too small alone — append to previous chunk
      chunks[chunks.length - 1] += "\n\n" + content;
    } else if (content) {
      chunks.push(content);
    }
    // Carry overlap from end of buffer
    const words = buffer.trim().split(/\s+/).filter(Boolean);
    const carry = words.slice(-overlapWords).join(" ");
    buffer = activePrefix + (carry ? carry + " " : "");
    bufferWords = wordCount(buffer);
  };

  const startNewWithPrefix = () => {
    activePrefix = buildHeadingPrefix(headingStack);
    buffer = activePrefix;
    bufferWords = wordCount(buffer);
  };

  for (const block of blocks) {
    if (block.type === "heading") {
      // Update heading stack
      headingStack[block.level - 1] = block.text;
      // Truncate deeper levels
      headingStack.length = block.level;
      // If buffer has meaningful content, flush before starting new section
      if (bufferWords > MIN_WORDS) {
        flush();
      }
      // Refresh active prefix for upcoming content
      activePrefix = buildHeadingPrefix(headingStack);
      // Ensure heading itself appears in next chunk
      buffer = activePrefix + block.raw + "\n";
      bufferWords = wordCount(buffer);
      continue;
    }

    const blockWords = wordCount(block.raw);

    // Atomic blocks (tables / lists) — never split mid-block
    if (block.type === "table" || block.type === "list") {
      // If adding this block would exceed hard cap, flush first
      if (bufferWords + blockWords > MAX_HARD && bufferWords > 0) {
        flush();
      }
      // Even if the block itself is huge, keep it whole as its own chunk
      if (blockWords > MAX_HARD) {
        flush(); // flush whatever was buffered
        const standalone = (activePrefix + block.raw).trim();
        chunks.push(standalone);
        // No overlap for atomic-large blocks
        startNewWithPrefix();
        continue;
      }
      buffer += (buffer.endsWith("\n") ? "" : "\n") + block.raw + "\n";
      bufferWords += blockWords;
      if (bufferWords >= targetWords) flush();
      continue;
    }

    // Paragraph
    if (bufferWords + blockWords > targetWords && bufferWords >= MIN_WORDS) {
      flush();
    }

    // If a single paragraph is huge, fall back to word-slicing it
    if (blockWords > MAX_HARD) {
      flush();
      const words = block.raw.split(/\s+/).filter(Boolean);
      const step = Math.max(1, targetWords - overlapWords);
      for (let k = 0; k < words.length; k += step) {
        const slice = words.slice(k, k + targetWords).join(" ");
        chunks.push((activePrefix + slice).trim());
      }
      startNewWithPrefix();
      continue;
    }

    buffer += (buffer.endsWith("\n") ? "" : "\n") + block.raw + "\n";
    bufferWords += blockWords;
  }

  // Final flush
  if (buffer.trim()) {
    const content = buffer.trim();
    if (content && content !== activePrefix.trim()) {
      chunks.push(content);
    }
  }

  // Edge case: nothing parsed → fallback to plain word chunking
  if (chunks.length === 0 && markdown.trim()) {
    const words = markdown.trim().split(/\s+/).filter(Boolean);
    const step = Math.max(1, targetWords - overlapWords);
    for (let k = 0; k < words.length; k += step) {
      const slice = words.slice(k, k + targetWords).join(" ");
      if (slice) chunks.push(slice);
    }
  }

  return chunks;
}
