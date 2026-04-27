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

// ----------------- Query type classifier (for dynamic weights) -----------------
type QueryKind = "exact" | "semantic" | "default";

const EXACT_KEYWORDS = [
  "انسحاب", "اعتذار", "إنذار", "gpa", "تراكمي", "ساعة معتمدة", "ساعات معتمدة",
  "لائحة", "مادة", "رمز", "كود", "نسبة", "رسوم", "موعد", "تاريخ",
];

function classifyQueryKind(text: string): QueryKind {
  const t = text.trim();
  if (!t) return "default";
  const hasNumber = /\d/.test(t);
  const hasQuotes = /["'«»]/.test(t);
  const hasCode = /[A-Za-z]{2,}\d{2,}/.test(t); // e.g. CS101
  const lower = t.toLowerCase();
  const hasExactTerm = EXACT_KEYWORDS.some(k => lower.includes(k));

  if (hasCode || hasQuotes || (hasNumber && t.length < 80) || hasExactTerm) {
    return "exact";
  }
  // Long natural-language question → lean semantic
  if (t.split(/\s+/).length >= 6 && !hasNumber) {
    return "semantic";
  }
  return "default";
}

// ----------------- Settings -----------------
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
    // ---- New RAG settings ----
    enable_query_rewriting: "false",
    enable_reranking: "false",
    initial_results_count: "10",
    final_results_count: "5",
    weight_text_default: "0.4",
    weight_semantic_default: "0.6",
    weight_text_exact: "0.65",
    weight_text_semantic_lean: "0.3",
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

// ----------------- Query rewriting (optional) -----------------
async function tryRewriteQuery(supabaseUrl: string, supabaseKey: string, question: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1800);
    const r = await fetch(`${supabaseUrl}/functions/v1/rewrite-query`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
      body: JSON.stringify({ question }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!r.ok) return question;
    const data = await r.json();
    const rewritten = (data?.rewritten || "").toString().trim();
    return rewritten && rewritten.length >= 3 ? rewritten : question;
  } catch (e) {
    console.warn("[chat] rewrite fallback:", e instanceof Error ? e.message : e);
    return question;
  }
}

// ----------------- Lightweight reranking (no extra network) -----------------
function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[\s،,.;:!\?\(\)\[\]\|\/\\"'«»]+/).filter(w => w.length >= 2);
}

function rerankChunks(
  chunks: any[],
  queryText: string,
  finalCount: number,
): any[] {
  if (!chunks || chunks.length === 0) return [];
  const qTokens = new Set(tokenize(queryText));
  if (qTokens.size === 0) return chunks.slice(0, finalCount);

  const maxRank = Math.max(...chunks.map((c: any) => c.rank as number)) || 1;

  const scored = chunks.map((c: any, idx: number) => {
    const cTokens = tokenize(String(c.content || ""));
    let overlap = 0;
    for (const t of cTokens) if (qTokens.has(t)) overlap++;
    const overlapScore = qTokens.size > 0 ? Math.min(1, overlap / qTokens.size) : 0;
    const positionBoost = 1 - (idx / chunks.length); // earlier = slightly higher
    const normalizedRank = (c.rank as number) / maxRank;
    const finalScore = 0.5 * normalizedRank + 0.35 * overlapScore + 0.15 * positionBoost;
    return { ...c, _rerankScore: finalScore };
  });

  scored.sort((a: any, b: any) => b._rerankScore - a._rerankScore);
  return scored.slice(0, finalCount);
}

// ----------------- Main handler -----------------
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

    // --- Settings + cache + rate-limit + embedding (parallel) ---
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

    // We need settings before deciding whether to rewrite — but rewriting is optional.
    const settings = await settingsPromise;

    const enableRewrite = settings.enable_query_rewriting === "true";
    const rewritePromise: Promise<string> = enableRewrite
      ? tryRewriteQuery(supabaseUrl, supabaseKey, lastUserMessage)
      : Promise.resolve(lastUserMessage);

    const [rateResult, exactCached, queryEmbedding, rewrittenQuery] = await Promise.all([
      rateLimitPromise, cachePromise, embeddingPromise, rewritePromise,
    ]);

    // --- Semantic cache lookup (only if no exact hit and we have an embedding) ---
    let cached: { answer: string; sources: string | null } | null = exactCached as any;
    let semanticCacheHit = false;
    if (!cached && queryEmbedding && messages.length <= 1 && settings.cache_enabled === "true") {
      try {
        const threshold = parseFloat(settings.semantic_cache_threshold) || 0.92;
        const embStr = `[${queryEmbedding.join(",")}]`;
        const { data: semData } = await supabase.rpc("find_cached_answer_semantic", {
          query_embedding: embStr,
          similarity_threshold: threshold,
        });
        if (semData && semData.length > 0) {
          cached = { answer: semData[0].answer, sources: semData[0].sources };
          semanticCacheHit = true;
          console.log(`[chat] semantic cache hit similarity=${semData[0].similarity?.toFixed(3)}`);
        }
      } catch (e) {
        console.error("Semantic cache error:", e);
      }
    }

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

    // --- Choose dynamic weights based on query kind ---
    const queryKind = classifyQueryKind(lastUserMessage);
    const wTextDefault = parseFloat(settings.weight_text_default) || 0.4;
    const wSemDefault = parseFloat(settings.weight_semantic_default) || 0.6;
    const wTextExact = parseFloat(settings.weight_text_exact) || 0.65;
    const wTextLean = parseFloat(settings.weight_text_semantic_lean) || 0.3;

    let weightText = wTextDefault;
    let weightSemantic = wSemDefault;
    if (queryKind === "exact") {
      weightText = wTextExact;
      weightSemantic = Math.max(0, 1 - wTextExact);
    } else if (queryKind === "semantic") {
      weightText = wTextLean;
      weightSemantic = Math.max(0, 1 - wTextLean);
    }
    const debugRag = Deno.env.get("DEBUG_RAG") === "true";
    if (debugRag) {
      console.log(`[chat] queryKind=${queryKind} weights=text:${weightText} sem:${weightSemantic} rewrite=${enableRewrite}`);
    }

    // --- KNOWLEDGE SEARCH: hybrid with dynamic weights ---
    const enableRerank = settings.enable_reranking === "true";
    const finalCount = parseInt(settings.final_results_count) || parseInt(settings.search_results_count) || 5;
    const initialCount = enableRerank
      ? Math.max(finalCount, parseInt(settings.initial_results_count) || 10)
      : finalCount;

    let knowledgeContext = "";
    let sourceNames: string[] = [];
    let maxRank = 0;

    try {
      const rpcParams: any = {
        query_text: rewrittenQuery, // use rewritten if enabled, else original
        max_results: initialCount,
        weight_text: weightText,
        weight_semantic: weightSemantic,
      };
      if (queryEmbedding) {
        rpcParams.query_embedding = JSON.stringify(queryEmbedding);
      }

      let { data: chunks, error: rpcError } = await supabase.rpc("search_knowledge_hybrid", rpcParams);

      // If the rewritten search returned nothing and we used a rewrite, retry with original
      if (enableRewrite && rewrittenQuery !== lastUserMessage && (!chunks || chunks.length === 0)) {
        console.log("[chat] Rewrite returned 0 results, retrying with original question");
        const fallbackParams = { ...rpcParams, query_text: lastUserMessage };
        const retry = await supabase.rpc("search_knowledge_hybrid", fallbackParams);
        chunks = retry.data;
        rpcError = retry.error;
      }

      if (rpcError) console.error("[chat] hybrid search error:", rpcError);

      if (chunks && chunks.length > 0) {
        // Optional reranking
        let finalChunks = chunks;
        if (enableRerank) {
          try {
            if (debugRag) {
              console.log("[chat] rerank BEFORE:", chunks.map((c: any, i: number) =>
                `${i + 1}. ${c.document_name} (rank=${(c.rank as number).toFixed(3)})`).join(" | "));
            }
            finalChunks = rerankChunks(chunks, lastUserMessage, finalCount);
            if (debugRag) {
              console.log("[chat] rerank AFTER:", finalChunks.map((c: any, i: number) =>
                `${i + 1}. ${c.document_name} (score=${(c._rerankScore || 0).toFixed(3)})`).join(" | "));
            }
          } catch (e) {
            console.warn("[chat] rerank failed, using hybrid order:", e);
            finalChunks = chunks.slice(0, finalCount);
          }
        } else {
          finalChunks = chunks.slice(0, finalCount);
        }

        maxRank = Math.max(...finalChunks.map((c: any) => c.rank as number));
        // Filter sources: only chunks with rank >= half of confidence threshold count as "real" sources
        const minSourceRank = (parseInt(settings.confidence_threshold) || 30) / 100 * 0.5;
        const relevantChunks = finalChunks.filter((c: any) => (c.rank as number) >= minSourceRank);
        sourceNames = [...new Set(relevantChunks.map((c: any) => c.document_name as string))];
        knowledgeContext = "\n\n--- معلومات من قاعدة المعرفة الجامعية ---\n" +
          finalChunks.map((c: any) =>
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

    // --- Build system prompt with stronger anti-hallucination rules ---
    const toneInstruction = buildToneInstruction(settings.tone);
    const maxLen = parseInt(settings.max_response_length) || 1000;

    const strictBlock = settings.strict_sources === "true"
      ? `⛔ **قواعد إجبارية لمنع الهلوسة (لا تخالفها أبداً):**
1. أجب **حصرياً** من محتوى "معلومات قاعدة المعرفة الجامعية" المرفقة أدناه.
2. **ممنوع منعاً باتاً** الاستنتاج، التخمين، أو إضافة أي معلومة من معرفتك العامة.
3. إذا لم تجد إجابة واضحة في السياق المرفق، أجب حرفياً وفقط بالعبارة التالية:
   "${settings.fallback_message || "لا تتوفر لدي هذه المعلومة في قاعدة المعرفة الحالية."}"
4. لا تذكر أنك ذكاء اصطناعي ولا تعتذر عن قيودك ولا تشرح سبب عدم المعرفة.`
      : `📌 قواعد الموثوقية:
- اعتمد بشكل أساسي على "معلومات قاعدة المعرفة الجامعية" أدناه.
- إذا لم تكن متأكداً، اذكر ذلك بوضوح وانصح الطالب بالتواصل مع الجهة المختصة.
- لا تخترع أرقاماً أو تواريخ أو رموز مقررات غير موجودة في السياق.`;

    const systemPrompt = `أنت ${settings.assistant_name}، مساعد ذكاء اصطناعي متخصص في مساعدة طلاب الجامعة.

${strictBlock}

مهامك:
- الإجابة على أسئلة الطلاب المتعلقة بالجامعة والدراسة
- تقديم معلومات عن التسجيل، الجداول، المواد، والأنظمة الأكاديمية
- مساعدة الطلاب في فهم اللوائح والإجراءات الجامعية

قواعد عامة:
- أجب دائماً باللغة العربية
${toneInstruction}
- حافظ على إجابتك بحد أقصى ${maxLen} كلمة
- كن مختصراً ومفيداً
- لا تذكر أسماء الملفات أو المصادر داخل نص الإجابة (سيتم عرضها تلقائياً أسفل الرد)

🔖 **تتبّع المصادر المستخدمة (إلزامي):**
في **آخر سطر** من ردك بالضبط، أضف علامة HTML مخفية بهذا التنسيق الحرفي:
\`<!--USED_SOURCES: اسم_الملف_1 | اسم_الملف_2-->\`
- اذكر فقط أسماء الملفات التي **استخدمت معلومات منها فعلياً** في صياغة الرد.
- لا تضف ملفات لم تستفد من محتواها.
- إذا لم تستخدم أي معلومة من قاعدة المعرفة (مثل ردود الترحيب أو رسالة عدم التوفر)، اكتب: \`<!--USED_SOURCES: -->\`
- استخدم أسماء الملفات كما وردت في "[مصدر: ...]" حرفياً.

📐 **قواعد التنسيق الإلزامية (Markdown احترافي):**
1. **ابدأ بعنوان رئيسي** \`##\` متبوعاً برمز تعبيري مناسب (📋 📅 📚 ⚠️ ✅ 🎓 💡 📝).
2. **استخدم العناوين الفرعية** \`###\` لتقسيم الإجابات الطويلة.
3. **استخدم الجداول** عند عرض بيانات متعددة (مقررات، مواعيد، رسوم، شروط).
4. **استخدم القوائم المرقّمة** \`1.\` للخطوات، و**النقطية** \`-\` للعناصر.
5. **أبرز المصطلحات والأرقام المهمة** بـ \`**النص**\`.
6. استخدم **الأكواد المضمّنة** \`\\\`code\\\`\` للأرقام والرموز (مثل \`CS101\`).
7. استخدم **الاقتباسات** \`>\` للملاحظات والتنبيهات.
8. **افصل بين الأقسام** بسطر فارغ.
9. لا تفرط في الرموز التعبيرية — 1-3 رموز فقط ذات صلة.${knowledgeContext}${settings.custom_instruction?.trim() ? `\n\nتعليمات إضافية:\n${settings.custom_instruction}` : ""}`;

    // Convert model name
    let modelName = settings.ai_model || "gemini-3-flash-preview";
    if (modelName.startsWith("google/")) modelName = modelName.slice(7);
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

    const FALLBACK_MODEL = "gemini-2.5-flash";
    const modelsToTry = modelName === FALLBACK_MODEL ? [modelName] : [modelName, FALLBACK_MODEL];

    let response: Response | null = null;
    let lastStatus = 0;
    let lastErrText = "";

    for (const m of modelsToTry) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:streamGenerateContent?alt=sse&key=${GOOGLE_AI_API_KEY}`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      });
      if (r.ok) {
        response = r;
        if (m !== modelName) console.log(`[chat] Primary "${modelName}" failed, succeeded with "${m}"`);
        break;
      }
      lastStatus = r.status;
      lastErrText = await r.text().catch(() => "");
      console.error(`[chat] Model "${m}" returned ${r.status}: ${lastErrText.slice(0, 200)}`);
      if (![429, 500, 502, 503, 504].includes(r.status)) break;
    }

    if (!response) {
      const friendly = lastStatus === 429
        ? "⚠️ تم تجاوز حد الطلبات. يرجى المحاولة بعد دقيقة."
        : (lastStatus === 503 || lastStatus >= 500)
          ? "⚠️ النموذج الذكي مشغول حالياً بسبب الضغط. يرجى المحاولة بعد قليل."
          : "حدث خطأ في المساعد الذكي. حاول مرة أخرى.";
      return new Response(
        JSON.stringify({ error: friendly, fallback: true, status: lastStatus }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = response.body!.getReader();

    (async () => {
      let fullContent = "";
      let pendingText = ""; // buffer to hide USED_SOURCES marker from client
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();

      const flushSafe = async (force = false) => {
        const KEEP_TAIL = 60;
        if (force) {
          const cleaned = pendingText.replace(/<!--\s*USED_SOURCES:[\s\S]*?-->/gi, "").trimEnd();
          if (cleaned.length > 0) {
            const openaiChunk = { choices: [{ delta: { content: cleaned } }] };
            await writer.write(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
          }
          pendingText = "";
          return;
        }
        if (pendingText.length > KEEP_TAIL) {
          const emitLen = pendingText.length - KEEP_TAIL;
          let emit = pendingText.slice(0, emitLen);
          pendingText = pendingText.slice(emitLen);
          const markerIdx = emit.indexOf("<!--");
          if (markerIdx !== -1) {
            const safe = emit.slice(0, markerIdx);
            pendingText = emit.slice(markerIdx) + pendingText;
            if (safe) {
              const openaiChunk = { choices: [{ delta: { content: safe } }] };
              await writer.write(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
            }
          } else if (emit) {
            const openaiChunk = { choices: [{ delta: { content: emit } }] };
            await writer.write(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
          }
        }
      };

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
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                fullContent += text;
                pendingText += text;
                await flushSafe(false);
              }
            } catch {}
          }
        }
        await flushSafe(true);

        // Extract used sources from full content
        let finalSources: string[] = sourceNames;
        const markerMatch = fullContent.match(/<!--\s*USED_SOURCES:\s*([\s\S]*?)-->/i);
        const cleanForCheck = fullContent.replace(/<!--[\s\S]*?-->/g, "").trim();
        const fallbackMsg = (settings.fallback_message || "").trim();
        const lowConfMsg = (settings.low_confidence_message || "").trim();
        const isFallbackAnswer =
          (fallbackMsg && cleanForCheck.includes(fallbackMsg.slice(0, 30))) ||
          (lowConfMsg && cleanForCheck.includes(lowConfMsg.slice(0, 30)));

        if (markerMatch) {
          const raw = markerMatch[1].trim();
          if (raw && raw !== "-") {
            const declared = raw.split(/[|،,]/).map(s => s.trim()).filter(Boolean);
            const intersect = declared.filter(d =>
              sourceNames.some(s => s === d || s.includes(d) || d.includes(s))
            );
            // If model declared sources but none matched, keep top retrieved as fallback
            finalSources = intersect.length > 0
              ? [...new Set(intersect)]
              : (isFallbackAnswer ? [] : sourceNames.slice(0, 1));
          } else {
            // Empty marker: only suppress if it's truly a fallback answer
            finalSources = isFallbackAnswer ? [] : sourceNames.slice(0, 1);
          }
        }
        // Suppress sources only if it's a fallback answer or confidence is far below threshold
        if (isFallbackAnswer || confidencePercent < confidenceThreshold * 0.5) {
          finalSources = [];
        }

        if (settings.show_sources === "true" && finalSources.length > 0) {
          const meta = { meta: { sources: finalSources.join("، ") } };
          await writer.write(encoder.encode(`data: ${JSON.stringify(meta)}\n\n`));
        }
        await writer.write(encoder.encode("data: [DONE]\n\n"));

        const cleanContent = fullContent.replace(/<!--\s*USED_SOURCES:[\s\S]*?-->/gi, "").trimEnd();

        if (cleanContent) {
          try {
            const sourcesStr = finalSources.length > 0 ? finalSources.join("، ") : null;
            await supabase.from("chat_logs").insert({
              question: lastUserMessage, question_hash: questionHash,
              sources: sourcesStr, cached: false, user_id: userId,
              category: classifyQuestion(lastUserMessage),
            });
          } catch (e) {
            console.error("Chat log error:", e);
          }
        }

        if (cleanContent && settings.cache_enabled === "true" && messages.length <= 1) {
          try {
            const sourcesStr = finalSources.length > 0 ? finalSources.join("، ") : null;
            const ttlMinutes = parseInt(settings.cache_ttl_minutes) || 1440;
            const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
            await supabase.from("response_cache").upsert({
              question_hash: questionHash, question: lastUserMessage,
              answer: cleanContent, sources: sourcesStr, expires_at: expiresAt,
            }, { onConflict: "question_hash" });
          } catch (e) {
            console.error("Cache save error:", e);
          }
        }
      } catch (e) {
        console.error("Stream processing error:", e);
      } finally {
        await writer.close();
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
