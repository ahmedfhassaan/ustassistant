import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

function classifyQuestion(text: string): string {
  const lower = text.trim().toLowerCase();
  const categories: [string, string[]][] = [
    ["تسجيل", ["تسجيل", "قبول", "تقديم", "التحاق", "فصل دراسي", "الفصل القادم"]],
    ["امتحانات", ["امتحان", "اختبار", "تأجيل امتحان", "درجات", "نتائج", "معدل", "تراكمي", "كشف درجات"]],
    ["مالي", ["رسوم", "مالي", "دفع", "أقساط", "منحة", "خصم"]],
    ["إداري", ["تحويل", "انسحاب", "وثيقة", "شهادة", "خطاب", "تعريف", "إفادة"]],
    ["خدمات", ["مكتبة", "سكن", "مواقف", "كافتيريا", "نادي", "رياضة", "نشاط"]],
    ["أكاديمي", ["مادة", "مقرر", "حذف مادة", "إضافة مادة", "جدول", "ساعات", "خطة دراسية", "تخصص"]],
  ];
  for (const [cat, keywords] of categories) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return "عام";
}

async function loadSettings(supabase: any): Promise<Record<string, string>> {
  const defaults: Record<string, string> = {
    assistant_name: "المساعد الجامعي الذكي",
    welcome_message: "كيف يمكنني مساعدتك اليوم؟",
    tone: "professional",
    max_response_length: "1000",
    show_sources: "true",
    fallback_message: "عذراً، لم أجد معلومات مؤكدة حول هذا السؤال. يرجى التواصل مع الجهة المختصة في الجامعة.",
    strict_sources: "false",
    cache_enabled: "true",
    cache_ttl_minutes: "1440",
    search_results_count: "5",
    ai_model: "google/gemini-3-flash-preview",
    confidence_threshold: "30",
    low_confidence_message: "لا توجد معلومة مؤكدة حول هذا الموضوع. يرجى مراجعة الجهة المختصة.",
    max_messages_per_day: "100",
    abuse_protection: "true",
  };
  try {
    const { data } = await supabase.from("assistant_settings").select("key, value");
    if (data) for (const row of data) defaults[row.key] = row.value;
  } catch (e) {
    console.error("Failed to load settings:", e);
  }
  return defaults;
}

function buildToneInstruction(tone: string): string {
  switch (tone) {
    case "friendly": return "- كن ودياً ومرحاً في ردودك، واستخدم لغة قريبة من الطلاب";
    case "concise": return "- كن مختصراً جداً وادخل في الموضوع مباشرة بدون مقدمات";
    case "academic": return "- استخدم لغة أكاديمية رسمية ومصطلحات علمية دقيقة";
    default: return "- كن مهذباً ومحترفاً في ردودك";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messages } = body;
    const userId = body.user_id || null;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "الرسائل مطلوبة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "مفتاح Google AI API غير مهيأ" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const lastUserMessage = [...messages].reverse().find(m => m.role === "user")?.content || "";
    const questionHash = hashQuestion(lastUserMessage);

    // --- Run settings, rate limit, cache, and embedding in parallel ---
    const settingsPromise = loadSettings(supabase);

    const rateLimitPromise = (async () => {
      if (!userId) return { limited: false };
      try {
        const { count } = await supabase
          .from("chat_logs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", new Date(Date.now() - 86400000).toISOString());
        return { limited: false, count: count || 0 };
      } catch { return { limited: false, count: 0 }; }
    })();

    const cachePromise = (async () => {
      if (messages.length > 1) return null;
      try {
        const { data } = await supabase
          .from("response_cache")
          .select("answer, sources")
          .eq("question_hash", questionHash)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();
        return data;
      } catch { return null; }
    })();

    const embeddingPromise = (async (): Promise<number[] | null> => {
      try {
        const embResponse = await fetch(`${supabaseUrl}/functions/v1/generate-embedding`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ texts: [lastUserMessage] }),
        });
        if (embResponse.ok) {
          const embData = await embResponse.json();
          return embData.embeddings?.[0] || null;
        }
        return null;
      } catch (e) {
        console.error("Query embedding error:", e);
        return null;
      }
    })();

    const [settings, rateResult, cached, queryEmbedding] = await Promise.all([
      settingsPromise, rateLimitPromise, cachePromise, embeddingPromise,
    ]);

    // --- Rate limit check ---
    if (settings.abuse_protection === "true" && userId) {
      const maxPerDay = parseInt(settings.max_messages_per_day) || 100;
      if (rateResult.count && rateResult.count >= maxPerDay) {
        return new Response(
          JSON.stringify({ error: "تم تجاوز الحد اليومي للرسائل. حاول مرة أخرى غداً." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // --- Cache hit ---
    if (cached && settings.cache_enabled === "true") {
      try {
        await supabase.from("chat_logs").insert({
          question: lastUserMessage,
          question_hash: questionHash,
          sources: cached.sources,
          user_id: userId,
          cached: true,
          category: classifyQuestion(lastUserMessage),
        });
      } catch {}
      return new Response(
        JSON.stringify({
          cached: true,
          content: cached.answer,
          sources: settings.show_sources === "true" ? cached.sources : null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- KNOWLEDGE SEARCH: always use hybrid ---
    let knowledgeContext = "";
    let sourceNames: string[] = [];
    let maxRank = 0;
    const searchCount = parseInt(settings.search_results_count) || 5;

    try {
      const rpcParams: any = {
        query_text: lastUserMessage,
        max_results: searchCount,
      };
      if (queryEmbedding) {
        rpcParams.query_embedding = JSON.stringify(queryEmbedding);
      }
      // query_embedding defaults to NULL in the SQL function if not provided

      const { data: chunks } = await supabase.rpc("search_knowledge_hybrid", rpcParams);

      if (chunks && chunks.length > 0) {
        sourceNames = [...new Set(chunks.map((c: any) => c.document_name as string))];
        maxRank = Math.max(...chunks.map((c: any) => c.rank as number));
        knowledgeContext = "\n\n--- معلومات من قاعدة المعرفة الجامعية ---\n" +
          chunks.map((c: any) =>
            `[مصدر: ${c.document_name} | درجة الصلة: ${((c.rank as number) * 100).toFixed(0)}%]\n${c.content}`
          ).join("\n\n") +
          "\n--- نهاية المعلومات ---";
      }
    } catch (e) {
      console.error("Knowledge search error:", e);
    }

    // --- Confidence check ---
    const confidenceThreshold = parseInt(settings.confidence_threshold) || 30;
    const confidencePercent = maxRank * 100;

    if (settings.strict_sources === "true" && sourceNames.length === 0) {
      const fallback = settings.fallback_message;
      try {
        await supabase.from("chat_logs").insert({
          question: lastUserMessage, question_hash: questionHash,
          sources: null, cached: false, user_id: userId,
          category: classifyQuestion(lastUserMessage),
        });
      } catch {}
      return new Response(
        JSON.stringify({ cached: true, content: fallback, sources: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (confidencePercent < confidenceThreshold && sourceNames.length > 0) {
      knowledgeContext += `\n\n⚠️ ملاحظة: درجة الصلة منخفضة (${confidencePercent.toFixed(0)}%). إذا لم تكن المعلومات كافية، استخدم هذه الرسالة: "${settings.low_confidence_message}"`;
    }

    // Build system prompt
    const toneInstruction = buildToneInstruction(settings.tone);
    const maxLen = parseInt(settings.max_response_length) || 1000;
    const showSourcesInstruction = settings.show_sources === "true"
      ? "- **مهم جداً**: في نهاية إجابتك، إذا استخدمت معلومات من قاعدة المعرفة، أضف سطراً بالتنسيق التالي:\n  [المصادر: اسم_الملف1، اسم_الملف2]"
      : "- لا تذكر المصادر في إجابتك";
    const strictInstruction = settings.strict_sources === "true"
      ? `- إذا لم تجد معلومات في قاعدة المعرفة، لا تتخمن أو تنشئ إجابة. أجب فقط بـ: "${settings.fallback_message}"`
      : "- إذا لم تكن متأكداً من إجابة، اذكر ذلك بوضوح وانصح الطالب بالتواصل مع الجهة المختصة";

    const systemPrompt = `أنت ${settings.assistant_name}، مساعد ذكاء اصطناعي متخصص في مساعدة طلاب الجامعة.

مهامك:
- الإجابة على أسئلة الطلاب المتعلقة بالجامعة والدراسة
- تقديم معلومات عن التسجيل، الجداول، المواد، والأنظمة الأكاديمية
- مساعدة الطلاب في فهم اللوائح والإجراءات الجامعية
- تقديم نصائح أكاديمية ودراسية

قواعد:
- أجب دائماً باللغة العربية
${toneInstruction}
- حافظ على إجابتك بحد أقصى ${maxLen} كلمة
- إذا وجدت معلومات من قاعدة المعرفة أدناه، استخدمها في إجابتك
${showSourcesInstruction}
${strictInstruction}
- استخدم تنسيق Markdown عند الحاجة لتنظيم الإجابات
- كن مختصراً ومفيداً${knowledgeContext}${settings.custom_instruction?.trim() ? `\n\nتعليمات إضافية:\n${settings.custom_instruction}` : ""}`;

    // Convert model name: remove "google/" prefix if present
    let modelName = settings.ai_model || "gemini-3-flash-preview";
    if (modelName.startsWith("google/")) modelName = modelName.slice(7);
    // Also remove "openai/" prefix models — they won't work with Google API, fallback
    if (modelName.startsWith("openai/")) modelName = "gemini-3-flash-preview";

    // Convert messages to Google Gemini format
    const geminiContents = messages
      .filter((m: any) => m.role === "user" || m.role === "assistant")
      .map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const geminiBody: any = {
      contents: geminiContents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        maxOutputTokens: Math.min((parseInt(settings.max_response_length) || 1000) * 4, 8192),
      },
    };

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${GOOGLE_AI_API_KEY}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "تم تجاوز حد الطلبات. حاول مرة أخرى بعد قليل." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("Google AI error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "حدث خطأ في المساعد الذكي" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = response.body!.getReader();

    (async () => {
      let fullContent = "";
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      try {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIdx: number;
          while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, newlineIdx).replace(/\r$/, "");
            buffer = buffer.slice(newlineIdx + 1);

            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(jsonStr);
              // Extract text from Google Gemini SSE format
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                fullContent += text;
                // Convert to OpenAI-compatible SSE format for the frontend
                const openaiChunk = {
                  choices: [{ delta: { content: text } }],
                };
                await writer.write(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
              }
            } catch {}
          }
        }
        // Send [DONE] marker
        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } catch (e) {
        console.error("Stream processing error:", e);
      } finally {
        await writer.close();
      }

      if (fullContent) {
        try {
          const sourcesStr = sourceNames.length > 0 ? sourceNames.join("، ") : null;
          await supabase.from("chat_logs").insert({
            question: lastUserMessage, question_hash: questionHash,
            sources: sourcesStr, cached: false, user_id: userId,
            category: classifyQuestion(lastUserMessage),
          });
        } catch (e) {
          console.error("Chat log error:", e);
        }
      }

      if (fullContent && settings.cache_enabled === "true" && messages.length <= 1) {
        try {
          const sourcesStr = sourceNames.length > 0 ? sourceNames.join("، ") : null;
          const ttlMinutes = parseInt(settings.cache_ttl_minutes) || 1440;
          const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
          await supabase.from("response_cache").upsert({
            question_hash: questionHash, question: lastUserMessage,
            answer: fullContent, sources: sourcesStr, expires_at: expiresAt,
          }, { onConflict: "question_hash" });
        } catch (e) {
          console.error("Cache save error:", e);
        }
      }

      try {
        await supabase.from("response_cache").delete().lt("expires_at", new Date().toISOString());
      } catch {}
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
