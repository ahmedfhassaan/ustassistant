import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Simple hash for cache key generation.
 * Normalizes the question by trimming, lowercasing, and removing extra spaces.
 */
function hashQuestion(text: string): string {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, " ");
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const chr = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return "q_" + Math.abs(hash).toString(36);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "الرسائل مطلوبة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "مفتاح API غير مهيأ" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const lastUserMessage = [...messages].reverse().find(m => m.role === "user")?.content || "";
    const questionHash = hashQuestion(lastUserMessage);

    // --- CACHE CHECK ---
    // Only use cache for single-turn questions (first message in conversation)
    if (messages.length <= 1) {
      try {
        const { data: cached } = await supabase
          .from("response_cache")
          .select("answer, sources")
          .eq("question_hash", questionHash)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();

        if (cached) {
          // Log cached response
          try {
            await supabase.from("chat_logs").insert({
              question: lastUserMessage,
              question_hash: questionHash,
              sources: cached.sources,
              cached: true,
              user_id: null,
            });
          } catch (e) {
            console.error("Cache log error:", e);
          }

          // Return cached response as a non-streaming JSON response
          return new Response(
            JSON.stringify({ 
              cached: true, 
              content: cached.answer, 
              sources: cached.sources 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (e) {
        console.error("Cache lookup error:", e);
      }
    }

    // --- KNOWLEDGE SEARCH (RAG) ---
    let knowledgeContext = "";
    let sourceNames: string[] = [];

    try {
      const { data: chunks } = await supabase.rpc("search_knowledge", {
        query_text: lastUserMessage,
        max_results: 5,
      });

      if (chunks && chunks.length > 0) {
        // Deduplicate source names
        sourceNames = [...new Set(chunks.map((c: any) => c.document_name))];
        
        knowledgeContext = "\n\n--- معلومات من قاعدة المعرفة الجامعية ---\n" +
          chunks.map((c: any, i: number) => 
            `[مصدر: ${c.document_name} | درجة الصلة: ${(c.rank * 100).toFixed(0)}%]\n${c.content}`
          ).join("\n\n") +
          "\n--- نهاية المعلومات ---";
      }
    } catch (e) {
      console.error("Knowledge search error:", e);
    }

    const systemPrompt = `أنت المساعد الجامعي الذكي، مساعد ذكاء اصطناعي متخصص في مساعدة طلاب الجامعة.

مهامك:
- الإجابة على أسئلة الطلاب المتعلقة بالجامعة والدراسة
- تقديم معلومات عن التسجيل، الجداول، المواد، والأنظمة الأكاديمية
- مساعدة الطلاب في فهم اللوائح والإجراءات الجامعية
- تقديم نصائح أكاديمية ودراسية

قواعد:
- أجب دائماً باللغة العربية
- كن مهذباً ومحترفاً
- إذا وجدت معلومات من قاعدة المعرفة أدناه، استخدمها في إجابتك
- **مهم جداً**: في نهاية إجابتك، إذا استخدمت معلومات من قاعدة المعرفة، أضف سطراً بالتنسيق التالي:
  [المصادر: اسم_الملف1، اسم_الملف2]
- إذا لم تكن متأكداً من إجابة، اذكر ذلك بوضوح وانصح الطالب بالتواصل مع الجهة المختصة
- استخدم تنسيق Markdown عند الحاجة لتنظيم الإجابات
- كن مختصراً ومفيداً${knowledgeContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "تم تجاوز حد الطلبات. حاول مرة أخرى بعد قليل." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "يرجى إضافة رصيد لاستخدام المساعد الذكي." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "حدث خطأ في المساعد الذكي" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For streaming, we need to intercept the stream to cache the response
    // We'll use a TransformStream to collect the full response while streaming
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = response.body!.getReader();

    // Process stream in background - collect full response for caching
    (async () => {
      let fullContent = "";
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Pass through to client
          await writer.write(value);
          
          // Collect content for caching
          const text = decoder.decode(value, { stream: true });
          for (const line of text.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) fullContent += delta;
            } catch { /* partial JSON */ }
          }
        }
      } catch (e) {
        console.error("Stream processing error:", e);
      } finally {
        await writer.close();
      }

      // Log to chat_logs
      if (fullContent) {
        try {
          const sourcesStr = sourceNames.length > 0 ? sourceNames.join("، ") : null;
          const userId = messages[0]?.user_id || null;
          await supabase.from("chat_logs").insert({
            question: lastUserMessage,
            question_hash: questionHash,
            sources: sourcesStr,
            cached: false,
            user_id: userId,
          });
        } catch (e) {
          console.error("Chat log error:", e);
        }
      }

      // Cache the response (only for single-turn, non-empty responses)
      if (fullContent && messages.length <= 1) {
        try {
          const sourcesStr = sourceNames.length > 0 ? sourceNames.join("، ") : null;
          await supabase
            .from("response_cache")
            .upsert({
              question_hash: questionHash,
              question: lastUserMessage,
              answer: fullContent,
              sources: sourcesStr,
            }, { onConflict: "question_hash" });
        } catch (e) {
          console.error("Cache save error:", e);
        }
      }

      // Cleanup expired cache entries (best-effort, non-blocking)
      try {
        await supabase
          .from("response_cache")
          .delete()
          .lt("expires_at", new Date().toISOString());
      } catch { /* ignore */ }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
