import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { generateQueryVariants } from "../_shared/arabic-normalize.ts";

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

// Unified question intent classifier
// Used to route RAG behavior — primarily to decide when to exclude graduation project docs.
type QuestionIntent =
  | "admission"
  | "registration"
  | "curriculum"
  | "graduation_projects"
  | "other";

function classifyIntent(text: string): QuestionIntent {
  const t = (text || "").toLowerCase();

  // 1) Explicit graduation projects — checked first to avoid being filtered out.
  const projectKeywords = [
    "مشاريع التخرج", "مشروع التخرج", "مشروع تخرج", "مشاريع تخرج",
    "مشاريع سابقة", "أمثلة مشاريع", "امثلة مشاريع", "نماذج مشاريع",
    "graduation project", "graduation projects",
  ];
  if (projectKeywords.some(k => t.includes(k))) return "graduation_projects";

  // 2) Admission / application
  const admissionKeywords = [
    "قبول", "التحاق", "شروط القبول", "أوراق القبول", "اوراق القبول",
    "رسوم القبول", "نسبة القبول", "كيف اقدم", "كيف أقدم", "كيف أقدّم",
    "تقديم", "التقديم", "التسجيل بالجامعة", "التسجيل في الجامعة",
  ];
  if (admissionKeywords.some(k => t.includes(k))) return "admission";

  // 3) Registration (course registration / add-drop / scheduling)
  const registrationKeywords = [
    "تسجيل المقررات", "تسجيل المواد", "حذف وإضافة", "حذف واضافة",
    "سحب مادة", "سحب مقرر", "فتح التسجيل", "مواعيد التسجيل",
    "الفصل القادم", "جدول التسجيل", "كيف اسجل", "كيف أسجل",
  ];
  if (registrationKeywords.some(k => t.includes(k))) return "registration";

  // 4) Curriculum / study plans
  const curriculumKeywords = [
    "خطة دراسية", "الخطة الدراسية", "خطه دراسيه", "خطة الدراسة",
    "مقرر", "مقررات", "مادة", "مواد", "ساعة معتمدة", "ساعات معتمدة",
    "جدول دراسي", "تخصص", "التخصص", "رمز مقرر", "رمز المادة", "كود المادة",
    "البرنامج الدراسي", "متطلبات التخرج",
  ];
  if (curriculumKeywords.some(k => t.includes(k))) return "curriculum";

  return "other";
}

// Backward-compat shim (kept in case other callers reference it).
function isAdmissionOrCurriculumQuestion(text: string): boolean {
  const i = classifyIntent(text);
  return i === "admission" || i === "registration" || i === "curriculum";
}

// Detect graduation project documents by name pattern
function isGraduationProjectDoc(name: string): boolean {
  if (!name) return false;
  const n = name.trim();
  const projectPrefixes = ["مشروع", "نظام", "تطبيق", "منصة", "موقع", "بوابة"];
  const officialKeywords = ["دليل", "خطة", "خطه", "لائحة", "لائحه", "سياسة", "سياسه", "رسوم", "نظام الجامعة", "اللائحة"];
  const startsWithProject = projectPrefixes.some(p => n.startsWith(p));
  const isOfficial = officialKeywords.some(k => n.includes(k));
  return startsWithProject && !isOfficial;
}

// ----------------- Query type classifier (for dynamic weights) -----------------
type QueryKind = "exact" | "semantic" | "default";

const EXACT_KEYWORDS = [
  "انسحاب", "اعتذار", "إنذار", "gpa", "تراكمي", "ساعة معتمدة", "ساعات معتمدة",
  "لائحة", "مادة", "رمز", "كود", "نسبة", "رسوم", "موعد", "تاريخ",
];

function userExplicitlyWantsWeb(text: string): boolean {
  const t = text.toLowerCase();
  const triggers = [
    "من موقع", "من الموقع", "موقع الجامعة", "الموقع الرسمي",
    "ابحث في الموقع", "ابحث على الإنترنت", "ابحث في الانترنت",
    "ابحث في الإنترنت", "ابحث بالموقع", "ابحث بالانترنت",
    "بحث مباشر", "البحث المباشر", "من الويب", "من الانترنت", "من الإنترنت",
    "آخر تحديث", "أحدث المعلومات", "محدّث", "محدث",
  ];
  return triggers.some(k => t.includes(k));
}

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
    enable_query_rewriting: "true",
    enable_reranking: "false",
    initial_results_count: "15",
    final_results_count: "8",
    weight_text_default: "0.4",
    weight_semantic_default: "0.6",
    weight_text_exact: "0.65",
    weight_text_semantic_lean: "0.3",
    // ---- Live Search ----
    live_search_enabled: "true",
    live_search_max_results: "4",
    live_search_timeout_ms: "12000",
    web_crawl_root_url: "https://www.ust.edu",
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

function normalizeArabicForMatch(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ؤئ]/g, "ء")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[^ -\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(text: string): string {
  return (text || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtmlContent(html: string): string {
  return decodeHtmlEntities(
    (html || "")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function isAllowedUstUrl(rawUrl: string): boolean {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, "");
    return (host === "ust.edu" || host.endsWith(".ust.edu")) && !host.endsWith("ust.edu.ye");
  } catch {
    return false;
  }
}

function scoreUstSearchResult(query: string, title: string, snippet: string): number {
  const q = normalizeArabicForMatch(query);
  const titleNorm = normalizeArabicForMatch(title);
  const snippetNorm = normalizeArabicForMatch(snippet);
  const hay = `${titleNorm} ${snippetNorm}`.trim();
  if (!q || !hay) return 0;

  let score = 0;
  if (titleNorm.includes(q)) score += 8;
  if (hay.includes(q)) score += 5;

  const tokens = q.split(" ").filter((w) => w.length >= 3);
  for (const token of tokens) {
    if (titleNorm.includes(token)) score += 2;
    else if (hay.includes(token)) score += 1;
  }

  return score;
}

function shouldForceOfficialWebLookup(query: string, docsContext: string): boolean {
  const normalizedQuery = normalizeArabicForMatch(query);
  const tokens = normalizedQuery.split(" ").filter((w) => w.length >= 3);
  if (!normalizedQuery || normalizedQuery.length < 5 || tokens.length === 0 || tokens.length > 4) {
    return false;
  }
  const normalizedDocs = normalizeArabicForMatch(docsContext || "");
  if (!normalizedDocs) return true;
  if (normalizedDocs.includes(normalizedQuery)) return false;
  const matched = tokens.filter((t) => normalizedDocs.includes(t)).length;
  return matched < Math.max(1, Math.ceil(tokens.length * 0.7));
}

async function fetchDirectUstSiteContext(query: string, timeoutMs: number, maxResults = 4): Promise<{ context: string; sourceNames: string[] } | null> {
  const variants = [query, ...generateQueryVariants(query)].map((v) => v.trim()).filter(Boolean);
  const searchQueries = [...new Set(variants)].slice(0, 3);
  const siteHeaders = {
    "User-Agent": "Mozilla/5.0 (compatible; USTAssistant/1.0)",
    "Accept-Language": "ar,en;q=0.8",
  };

  type SearchHit = { title: string; url: string; snippet: string; score: number };
  const hits = new Map<string, SearchHit>();

  for (const searchQuery of searchQueries) {
    const searchUrl = `https://ust.edu/?s=${encodeURIComponent(searchQuery)}`;
    const searchRes = await fetch(searchUrl, {
      headers: siteHeaders,
      signal: AbortSignal.timeout(Math.min(timeoutMs, 12000)),
    });
    if (!searchRes.ok) continue;
    const html = await searchRes.text();
    const articleBlocks = html.match(/<article\b[\s\S]*?<\/article>/gi) || [];

    for (const block of articleBlocks) {
      const anchors = [...block.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
      const best = anchors
        .map((m) => ({ url: (m[1] || "").trim(), title: stripHtmlContent(m[2] || "") }))
        .filter((a) => a.title.length >= 4 && isAllowedUstUrl(a.url))
        .sort((a, b) => b.title.length - a.title.length)[0];

      if (!best) continue;

      const snippet = stripHtmlContent(block).replace(best.title, "").slice(0, 320);
      const score = scoreUstSearchResult(query, best.title, snippet);
      const prev = hits.get(best.url);
      if (!prev || score > prev.score) {
        hits.set(best.url, { title: best.title, url: best.url, snippet, score });
      }
    }
  }

  const ranked = [...hits.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(maxResults, 3)));

  if (ranked.length === 0) return null;

  const detailParts: string[] = [];
  const sourceNames: string[] = [];
  for (const hit of ranked.slice(0, 2)) {
    let pageText = "";
    try {
      const pageRes = await fetch(hit.url, {
        headers: siteHeaders,
        signal: AbortSignal.timeout(Math.min(timeoutMs, 12000)),
      });
      if (pageRes.ok) {
        const pageHtml = await pageRes.text();
        const focus = pageHtml.match(/<article\b[\s\S]*?<\/article>/i)?.[0]
          || pageHtml.match(/<main\b[\s\S]*?<\/main>/i)?.[0]
          || pageHtml.match(/<body\b[\s\S]*?<\/body>/i)?.[0]
          || pageHtml;
        pageText = stripHtmlContent(focus).slice(0, 1800);
      }
    } catch (e) {
      console.warn("[chat] Direct ust.edu fetch failed:", hit.url, e instanceof Error ? e.message : e);
    }

    sourceNames.push(hit.title);
    detailParts.push(
      `[مصدر: ${hit.title}]\nالرابط: ${hit.url}\n` +
      `ملخص نتيجة البحث: ${hit.snippet || "لا يوجد مقتطف واضح."}\n` +
      `نص من الصفحة: ${(pageText || hit.snippet || "").slice(0, 1800)}`
    );
  }

  if (detailParts.length === 0) return null;

  return {
    context: "\n\n--- معلومات مباشرة من موقع الجامعة الرسمي (بحث داخلي ust.edu) ---\n" +
      detailParts.join("\n\n") +
      "\n--- نهاية المعلومات المباشرة ---",
    sourceNames,
  };
}

// ----------------- Query rewriting (optional) -----------------
async function tryRewriteQuery(supabaseUrl: string, supabaseKey: string, question: string): Promise<{ rewritten: string; variants: string[] }> {
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
    if (!r.ok) return { rewritten: question, variants: [] };
    const data = await r.json();
    const rewritten = (data?.rewritten || "").toString().trim();
    const variantsRaw: any[] = Array.isArray(data?.variants) ? data.variants : [];
    const variants = variantsRaw
      .map(v => String(v || "").trim())
      .filter(v => v.length >= 3 && v.length <= 200);
    return {
      rewritten: rewritten && rewritten.length >= 3 ? rewritten : question,
      variants,
    };
  } catch (e) {
    console.warn("[chat] rewrite fallback:", e instanceof Error ? e.message : e);
    return { rewritten: question, variants: [] };
  }
}

// ----------------- Tokenization & MMR diversification -----------------
function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[\s،,.;:!\?\(\)\[\]\|\/\\"'«»]+/).filter(w => w.length >= 2);
}

function jaccardSimilarity(aTokens: Set<string>, bTokens: Set<string>): number {
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  let inter = 0;
  for (const t of aTokens) if (bTokens.has(t)) inter++;
  const union = aTokens.size + bTokens.size - inter;
  return union > 0 ? inter / union : 0;
}

/**
 * MMR (Maximal Marginal Relevance) selection.
 * Picks `finalCount` diverse chunks. λ=0.7 → prefer relevance,
 * (1-λ)=0.3 → penalize similarity to already-picked chunks.
 * Always includes the top-ranked chunk first.
 */
function mmrSelect(chunks: any[], finalCount: number, lambda = 0.7): any[] {
  if (!chunks || chunks.length === 0) return [];
  if (chunks.length <= finalCount) return chunks;

  const maxRank = Math.max(...chunks.map((c: any) => c.rank as number)) || 1;
  const tokenSets = chunks.map((c: any) => new Set(tokenize(String(c.content || ""))));

  const selected: number[] = [0]; // top-ranked first
  const remaining = new Set<number>();
  for (let i = 1; i < chunks.length; i++) remaining.add(i);

  while (selected.length < finalCount && remaining.size > 0) {
    let bestIdx = -1;
    let bestScore = -Infinity;
    for (const i of remaining) {
      const relevance = (chunks[i].rank as number) / maxRank;
      let maxSim = 0;
      for (const j of selected) {
        const sim = jaccardSimilarity(tokenSets[i], tokenSets[j]);
        if (sim > maxSim) maxSim = sim;
      }
      const mmrScore = lambda * relevance - (1 - lambda) * maxSim;
      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) break;
    selected.push(bestIdx);
    remaining.delete(bestIdx);
  }

  return selected.map(i => chunks[i]);
}

// ----------------- Lightweight reranking (no extra network) -----------------
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
    const positionBoost = 1 - (idx / chunks.length);
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
    const rewritePromise: Promise<{ rewritten: string; variants: string[] }> = enableRewrite
      ? tryRewriteQuery(supabaseUrl, supabaseKey, lastUserMessage)
      : Promise.resolve({ rewritten: lastUserMessage, variants: [] });

    const [rateResult, exactCached, queryEmbedding, rewriteResult] = await Promise.all([
      rateLimitPromise, cachePromise, embeddingPromise, rewritePromise,
    ]);
    const rewrittenQuery = rewriteResult.rewritten;
    const rewriteVariants = rewriteResult.variants;

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
    const explicitWeb = userExplicitlyWantsWeb(lastUserMessage);
    if (cached && settings.cache_enabled === "true" && !explicitWeb) {
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
          semantic_cache: semanticCacheHit,
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
    let resolvedQuestionForModel = lastUserMessage;
    const liveSearchEnabled = settings.live_search_enabled === "true";
    let liveSearchUsed = false;
    let docsContext = "";

    // When live search is enabled, exclude pre-crawled web documents from RPC results to avoid duplication with live results
    let excludedWebDocNames: Set<string> | null = null;
    if (liveSearchEnabled) {
      try {
        const { data: webDocs } = await supabase
          .from("knowledge_documents")
          .select("name")
          .neq("source_type", "manual");
        excludedWebDocNames = new Set((webDocs || []).map((d: any) => d.name as string));
      } catch (e) {
        console.warn("[chat] could not load web doc names:", e);
      }
    }

    try {
      const rpcParamsBase: any = {
        max_results: initialCount,
        weight_text: weightText,
        weight_semantic: weightSemantic,
      };
      if (queryEmbedding) {
        rpcParamsBase.query_embedding = JSON.stringify(queryEmbedding);
      }

      // Build query variants: original + arabic-normalized + fuzzy-corrected + (rewritten variants from LLM)
      const variants = generateQueryVariants(lastUserMessage);
      if (enableRewrite) {
        for (const v of [rewrittenQuery, ...rewriteVariants]) {
          if (v && v.length >= 3 && !variants.some(x => x.toLowerCase() === v.toLowerCase())) {
            variants.push(v);
          }
        }
      }

      // Run all variant searches in parallel
      const results = await Promise.all(
        variants.map(v => supabase.rpc("search_knowledge_hybrid", { ...rpcParamsBase, query_text: v }))
      );

      // UNION strategy: merge all variants' results, dedupe by chunk_id, keep MAX rank per chunk.
      // This ensures we don't lose contextual chunks (e.g. branch info) just because the
      // top variant didn't match them.
      const mergedById = new Map<string, any>();
      let rpcError: any = null;
      const variantScores: { v: string; n: number; top: number }[] = [];

      results.forEach((r, i) => {
        if (r.error && !rpcError) rpcError = r.error;
        const data = r.data || [];
        const top = data.length > 0 ? (data[0].rank as number) : 0;
        variantScores.push({ v: variants[i], n: data.length, top });
        for (const c of data) {
          const existing = mergedById.get(c.chunk_id);
          if (!existing || (c.rank as number) > (existing.rank as number)) {
            mergedById.set(c.chunk_id, c);
          }
        }
      });

      // Pick the variant with the best top rank just for "resolved question" display
      const bestVariantEntry = variantScores.reduce(
        (best, cur) => (cur.top > best.top ? cur : best),
        variantScores[0] || { v: variants[0], n: 0, top: 0 }
      );
      const bestVariant = bestVariantEntry.v;
      const normalizedBestVariant = bestVariant.trim().replace(/\s+/g, " ");
      const normalizedOriginalQuestion = lastUserMessage.trim().replace(/\s+/g, " ");
      if (normalizedBestVariant) {
        resolvedQuestionForModel = normalizedBestVariant;
      }

      // Sort merged chunks by rank (descending) → input for downstream selection
      let chunks: any[] | null = Array.from(mergedById.values()).sort(
        (a: any, b: any) => (b.rank as number) - (a.rank as number)
      );
      if (chunks.length === 0) chunks = null;

      if (debugRag) {
        console.log(`[chat] variants tried: ${variants.map(v => `"${v}"`).join(" | ")}`);
        console.log(`[chat] variant scores: ${variantScores.map(s => `"${s.v}" n=${s.n} top=${s.top.toFixed(3)}`).join(" | ")}`);
        console.log(`[chat] merged unique chunks: ${chunks?.length || 0}`);
        if (normalizedBestVariant && normalizedBestVariant !== normalizedOriginalQuestion) {
          console.log(`[chat] resolved question for model: "${resolvedQuestionForModel}"`);
        }
      }

      if (rpcError) console.error("[chat] hybrid search error:", rpcError);

      if (chunks && chunks.length > 0) {
        // Filter out web-crawled chunks when live search is active
        if (excludedWebDocNames && excludedWebDocNames.size > 0) {
          chunks = (chunks as any[]).filter((c: any) => !excludedWebDocNames!.has(c.document_name));
        }

        // Intent-based filter: route based on question intent
        const intent = classifyIntent(lastUserMessage);
        const shouldExcludeProjects =
          intent === "admission" || intent === "registration" || intent === "curriculum";
        console.log(`[chat] question intent=${intent} excludeProjects=${shouldExcludeProjects}`);

        if (shouldExcludeProjects) {
          const before = chunks.length;
          const filtered = (chunks as any[]).filter((c: any) => !isGraduationProjectDoc(c.document_name));
          if (filtered.length > 0) {
            chunks = filtered;
            console.log(`[chat] intent=${intent}: filtered ${before - filtered.length} project chunks, kept ${filtered.length}`);
          } else {
            console.log(`[chat] intent=${intent}: all ${before} chunks were projects → keeping none, will trigger live search`);
            chunks = null;
          }
        } else if (intent === "graduation_projects") {
          console.log(`[chat] intent=graduation_projects: keeping project chunks as-is`);
        }
      }

      if (chunks && chunks.length > 0) {
        // Selection strategy: rerank → MMR diversification → top-K
        let finalChunks = chunks;
        if (enableRerank) {
          try {
            // Rerank then diversify with MMR to avoid 8 near-duplicate chunks
            const reranked = rerankChunks(chunks, lastUserMessage, Math.min(chunks.length, finalCount * 2));
            finalChunks = mmrSelect(reranked, finalCount, 0.7);
            if (debugRag) {
              console.log("[chat] MMR-after-rerank:", finalChunks.map((c: any, i: number) =>
                `${i + 1}. ${c.document_name} (rank=${(c.rank as number).toFixed(3)})`).join(" | "));
            }
          } catch (e) {
            console.warn("[chat] rerank+mmr failed, using hybrid order:", e);
            finalChunks = mmrSelect(chunks, finalCount, 0.7);
          }
        } else {
          // Even without rerank, apply MMR for diversity
          finalChunks = mmrSelect(chunks, finalCount, 0.7);
          if (debugRag) {
            console.log("[chat] MMR selected:", finalChunks.map((c: any, i: number) =>
              `${i + 1}. ${c.document_name} (rank=${(c.rank as number).toFixed(3)})`).join(" | "));
          }
        }

        const docsMaxRank = Math.max(...finalChunks.map((c: any) => c.rank as number));
        maxRank = Math.max(maxRank, docsMaxRank);
        // Filter sources: only chunks with rank >= half of confidence threshold count as "real" sources
        const minSourceRank = (parseInt(settings.confidence_threshold) || 30) / 100 * 0.5;
        const relevantChunks = finalChunks.filter((c: any) => (c.rank as number) >= minSourceRank);
        const docSourceNames = [...new Set(relevantChunks.map((c: any) => c.document_name as string))];
        sourceNames = [...new Set([...sourceNames, ...docSourceNames])];
        docsContext = "\n\n--- معلومات من قاعدة المعرفة الجامعية ---\n" +
          finalChunks.map((c: any) =>
            `[مصدر: ${c.document_name} | درجة الصلة: ${((c.rank as number) * 100).toFixed(0)}%]\n${c.content}`
          ).join("\n\n") +
          "\n--- نهاية المعلومات ---";
      }
    } catch (e) {
      console.error("Knowledge search error:", e);
    }

    // ---- LIVE SEARCH (Google Search Grounding via Gemini): only if docs are insufficient ----
    const confThresholdFraction = (parseInt(settings.confidence_threshold) || 30) / 100;
    let docsInsufficient = maxRank < confThresholdFraction || sourceNames.length === 0;
    let liveContext = "";

    // Sufficiency gate: even with high rank, ask a fast LLM if docs actually answer the question
    let docsAnswerable = true;
    const forceOfficialWebLookup = shouldForceOfficialWebLookup(lastUserMessage, docsContext);
    if (liveSearchEnabled && docsContext && !docsInsufficient && !explicitWeb) {
      try {
        const sufUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GOOGLE_AI_API_KEY}`;
        const sufPrompt = `سؤال المستخدم:\n${lastUserMessage}\n\nالمقاطع المتاحة:\n${docsContext.slice(0, 6000)}\n\nهل تحتوي المقاطع أعلاه على إجابة فعلية ومحددة ومباشرة لنفس الكيان/المصطلح المطلوب في السؤال دون تعميم أو تخمين؟ إذا كان السؤال عن اسم جهة أو كلية أو برنامج أو صفحة محددة، فاعتبر الإجابة غير كافية ما لم يظهر هذا الاسم أو مرادفه بوضوح في المقاطع. أجب بكلمة واحدة فقط: YES أو NO.`;
        const sufRes = await fetch(sufUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: sufPrompt }] }],
            generationConfig: { temperature: 0, maxOutputTokens: 5 },
          }),
          signal: AbortSignal.timeout(3000),
        });
        if (sufRes.ok) {
          const sufData = await sufRes.json();
          const verdict = (sufData?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim().toUpperCase();
          docsAnswerable = !verdict.startsWith("NO");
          console.log(`[chat] SUFFICIENCY check: verdict="${verdict}" answerable=${docsAnswerable}`);
        }
      } catch (e) {
        console.warn("[chat] sufficiency check failed:", e instanceof Error ? e.message : e);
      }
    }
    if (forceOfficialWebLookup) {
      docsAnswerable = false;
      console.log(`[chat] FORCE WEB lookup for specific term: q="${lastUserMessage.slice(0,80)}"`);
    }
    if (!docsAnswerable) docsInsufficient = true;

    console.log(`[chat] LIVE SEARCH gate: enabled=${liveSearchEnabled} docsInsufficient=${docsInsufficient} explicitWeb=${explicitWeb} answerable=${docsAnswerable} maxRank=${maxRank.toFixed(3)} sourcesCount=${sourceNames.length} threshold=${confThresholdFraction}`);
    if (liveSearchEnabled && (docsInsufficient || explicitWeb)) {
      try {
        // Hard-locked to ust.edu (University of Science and Technology - Aden, Yemen)
        // DO NOT change to ust.edu.ye (that is a different university in Sanaa)
        const domain = "ust.edu";
        const timeoutMs = Math.min(Math.max(parseInt(settings.live_search_timeout_ms) || 12000, 3000), 30000);

        console.log(`[chat] GOOGLE GROUNDING start site:${domain} (Aden only) q="${lastUserMessage.slice(0,80)}"`);

        const groundingPrompt = `ابحث حصرياً في الموقع الرسمي لجامعة العلوم والتكنولوجيا - عدن، اليمن (الموقع: https://ust.edu فقط) عن إجابة دقيقة ومختصرة للسؤال التالي.

تعليمات صارمة:
- استخدم فقط المعلومات من نطاق ust.edu (وليس ust.edu.ye).
- تجاهل تماماً جامعة العلوم والتكنولوجيا في صنعاء (ust.edu.ye) ولا تستخدم أي معلومة منها.
- إذا لم تجد المعلومة في موقع ust.edu فقل بوضوح: "المعلومة غير متوفرة في الموقع الرسمي للجامعة" ولا تخمّن.
- استخدم عامل البحث: site:ust.edu

السؤال:
${lastUserMessage}`;

        const groundingUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`;
        const liveRes = await fetch(groundingUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: groundingPrompt }] }],
            tools: [{ google_search: {} }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (liveRes.ok) {
          const liveData = await liveRes.json();
          const candidate = liveData?.candidates?.[0];
          const groundedText = candidate?.content?.parts
            ?.map((p: any) => p?.text || "")
            .join("")
            .trim() || "";

          // Extract grounding sources (URLs from groundingChunks) - filter to ust.edu only
          const groundingChunks = candidate?.groundingMetadata?.groundingChunks || [];
          const liveSourceNames: string[] = [];
          const sourceLines: string[] = [];
          let acceptedCount = 0;
          let rejectedCount = 0;
          for (const ch of groundingChunks) {
            const web = ch?.web;
            if (web?.uri) {
              const title = (web.title || "").toString();
              const uri = web.uri.toString();
              let host = "";
              try { host = new URL(uri).hostname.toLowerCase().replace(/^www\./, ""); } catch { host = ""; }
              // Google Grounding often returns redirect URLs (vertexaisearch.cloud.google.com).
              // In that case, the real source domain is in `title`. Check both.
              const titleLower = title.toLowerCase();
              const isUstEdu =
                host === "ust.edu" || host.endsWith(".ust.edu") ||
                titleLower === "ust.edu" || titleLower.endsWith(".ust.edu");
              // Explicit reject for Sanaa university domain even if it sneaks in via title.
              const isSanaa = host.endsWith("ust.edu.ye") || titleLower.includes("ust.edu.ye");
              if (!isUstEdu || isSanaa) {
                rejectedCount++;
                continue;
              }
              acceptedCount++;
              const display = (title || uri).slice(0, 120);
              liveSourceNames.push(display);
              sourceLines.push(`- ${display} (${uri})`);
            }
          }
          console.log(`[chat] GOOGLE GROUNDING accepted=${acceptedCount} rejected=${rejectedCount} (only ust.edu allowed)`);

          if (groundedText && acceptedCount > 0) {
            liveSearchUsed = true;
            maxRank = Math.max(maxRank, 1);
            const officialLabel = `موقع الجامعة الرسمي (${domain})`;
            sourceNames = [...new Set([officialLabel, ...sourceNames, ...liveSourceNames])];
            liveContext = "\n\n--- معلومات مباشرة من البحث على الويب (Google Grounding) ---\n" +
              groundedText +
              (sourceLines.length ? "\n\nالمصادر:\n" + sourceLines.join("\n") : "") +
              "\n--- نهاية المعلومات المباشرة ---";
            if (debugRag) console.log(`[chat] GOOGLE GROUNDING got ${groundingChunks.length} sources, ${groundedText.length} chars`);
          } else if (groundedText && acceptedCount === 0) {
            console.warn("[chat] GOOGLE GROUNDING all sources rejected (not from ust.edu) — discarding answer");
          } else {
            console.warn("[chat] GOOGLE GROUNDING returned empty text");
          }

          if (!liveContext) {
            const directSite = await fetchDirectUstSiteContext(lastUserMessage, timeoutMs, parseInt(settings.live_search_max_results) || 4);
            if (directSite?.context) {
              liveSearchUsed = true;
              maxRank = Math.max(maxRank, 1);
              const officialLabel = `موقع الجامعة الرسمي (${domain})`;
              sourceNames = [...new Set([officialLabel, ...sourceNames, ...directSite.sourceNames])];
              liveContext = directSite.context;
              console.log(`[chat] DIRECT UST SEARCH fallback accepted=${directSite.sourceNames.length}`);
            }
          }
        } else {
          const errTxt = await liveRes.text().catch(() => "");
          console.error(`[chat] GOOGLE GROUNDING HTTP ${liveRes.status}: ${errTxt.slice(0, 300)}`);

          if (!liveContext) {
            const directSite = await fetchDirectUstSiteContext(lastUserMessage, timeoutMs, parseInt(settings.live_search_max_results) || 4);
            if (directSite?.context) {
              liveSearchUsed = true;
              maxRank = Math.max(maxRank, 1);
              const officialLabel = `موقع الجامعة الرسمي (${domain})`;
              sourceNames = [...new Set([officialLabel, ...sourceNames, ...directSite.sourceNames])];
              liveContext = directSite.context;
              console.log(`[chat] DIRECT UST SEARCH fallback accepted=${directSite.sourceNames.length}`);
            }
          }
        }
      } catch (e) {
        console.error("[chat] GOOGLE GROUNDING error:", e instanceof Error ? e.message : e);

        if (!liveContext) {
          try {
            const timeoutMs = Math.min(Math.max(parseInt(settings.live_search_timeout_ms) || 12000, 3000), 30000);
            const directSite = await fetchDirectUstSiteContext(lastUserMessage, timeoutMs, parseInt(settings.live_search_max_results) || 4);
            if (directSite?.context) {
              liveSearchUsed = true;
              maxRank = Math.max(maxRank, 1);
              const officialLabel = "موقع الجامعة الرسمي (ust.edu)";
              sourceNames = [...new Set([officialLabel, ...sourceNames, ...directSite.sourceNames])];
              liveContext = directSite.context;
              console.log(`[chat] DIRECT UST SEARCH fallback accepted=${directSite.sourceNames.length}`);
            }
          } catch (fallbackError) {
            console.error("[chat] DIRECT UST SEARCH fallback error:", fallbackError instanceof Error ? fallbackError.message : fallbackError);
          }
        }
      }
    }

    // Build final context: documents first, then live web results
    const preferWeb = explicitWeb || !docsAnswerable;
    knowledgeContext = preferWeb && liveContext
      ? (liveContext + (docsContext || ""))
      : ((docsContext || "") + (liveContext || ""));

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

    const webPriorityBlock = preferWeb && liveContext
      ? `\n\n🌐 **أولوية المصدر:** اعتمد **أولاً وبشكل رئيسي** على "معلومات مباشرة من موقع الجامعة (بحث لحظي)" أدناه، واذكر روابط المصادر إن أمكن. استخدم المستندات المحلية فقط كمكمّل عند الحاجة.`
      : "";

    const systemPrompt = `أنت ${settings.assistant_name}، مساعد ذكاء اصطناعي متخصص في مساعدة طلاب الجامعة.

${strictBlock}${webPriorityBlock}

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
9. لا تفرط في الرموز التعبيرية — 1-3 رموز فقط ذات صلة.

🧭 **قاعدة السياق الشامل (مهمة جداً — لكل سؤال):**
استعرض **كل** المقاطع المرفقة في "معلومات قاعدة المعرفة الجامعية" قبل صياغة الإجابة. إن وجدت في أي مقطع معلومات إضافية مرتبطة بموضوع السؤال، **اذكرها بإيجاز** ضمن إجابتك حتى لو لم يطلبها الطالب صراحةً، خاصةً:
- **المكان/الفرع**: في أي فرع/مدينة تتوفر هذه الخدمة أو التخصص (تعز، صنعاء، عدن، …).
- **الزمان/الموعد**: التواريخ، المواعيد، الفترات الزمنية، آخر موعد للتقديم.
- **الشروط والمتطلبات**: شروط التقديم، المتطلبات السابقة، المستندات المطلوبة.
- **الاستثناءات والبدائل**: الحالات الخاصة، البدائل المتاحة، الإعفاءات.
- **الرسوم والخصومات**: التكاليف المرتبطة، الخصومات، طرق الدفع.
- **جهة الاتصال أو المرجع**: القسم/المكتب المسؤول عند توفره في السياق.

🎯 **قاعدة الدقة الحرفية (إلزامية — لمنع التعميم الخاطئ لكل أنواع الأسئلة):**
1. **لا تعمّم أبداً**: إذا ذكر السياق معلومة لتخصص/فرع/فئة محددة (مثل: "امتحان المفاضلة لتخصصي الطب وطب الأسنان")، فلا تنسبها لتخصصات أخرى لم تُذكر صراحةً، حتى لو بدت مشابهة.
2. **اربط كل معلومة بسياقها الأصلي**: عند ذكر تاريخ/شرط/رسوم/خدمة، حدّد بوضوح **لمن/لأي تخصص/لأي فرع/في أي وقت** تنطبق كما ورد حرفياً في السياق.
3. **ميّز بين المذكور والناقص**: إذا سُئلت عن شيء محدد وكان السياق يذكر معلومات جزئية فقط (مثل: مواد امتحان دون موعده، أو موعد لتخصص آخر، أو رسوم بدون شروط الدفع)، فقل صراحةً: *"السياق يذكر [س] فقط، ولا يحدد [ص] لـ[التخصص/الفرع/الحالة] المطلوبة."* ثم اذكر ما هو متاح فعلاً.
4. **لا تدمج معلومات منفصلة في صياغة موحِّدة مضللة**: لا تكتب "الموعد لجميع التخصصات هو كذا" إذا كان السياق يحدده لتخصصين فقط — بل اذكر النطاق الحقيقي.
5. **عند سؤال "في أي مصدر؟" أو "أين ورد ذلك؟"**: ارجع إلى أسماء الملفات في وسوم \`[مصدر: ...]\` المرفقة، واذكرها بدقة. إن لم تجد المعلومة في أي مقطع، صرّح بذلك صراحةً ولا تخترع مصدراً.
6. **في حالة عدم وجود معلومة لحالة محددة في السياق**: لا تستنتج بناءً على القياس أو المنطق العام — قل بوضوح إن المعلومة غير متوفرة لتلك الحالة المحددة.

لا تخترع هذه المعلومات؛ اذكرها فقط إن وردت فعلياً في السياق المرفق، وبنفس الحدود والقيود التي وردت بها.${knowledgeContext}${settings.custom_instruction?.trim() ? `\n\nتعليمات إضافية:\n${settings.custom_instruction}` : ""}`;

    // Convert model name
    let modelName = settings.ai_model || "gemini-3-flash-preview";
    if (modelName.startsWith("google/")) modelName = modelName.slice(7);
    if (modelName.startsWith("openai/")) modelName = "gemini-3-flash-preview";

    // Convert messages to Google Gemini format
    const conversationForModel = messages.map((m: any, index: number) => {
      if (m.role !== "user" && m.role !== "assistant") return m;
      const isLatestUserMessage = m.role === "user" && index === messages.length - 1;
      if (!isLatestUserMessage) return m;
      return {
        ...m,
        content: resolvedQuestionForModel,
      };
    });

    const geminiContents = conversationForModel
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
          // Skip caching low-confidence / fallback answers so future identical questions
          // re-run the search pipeline (with normalization & fuzzy correction) instead
          // of being permanently locked to a failed response.
          const fallbackMsg = (settings.fallback_message || "").trim();
          const lowConfMsg = (settings.low_confidence_message || "").trim();
          const answerTrim = cleanContent.trim();
          const isFailedAnswer =
            answerTrim.length < 80 ||
            finalSources.length === 0 ||
            (fallbackMsg && answerTrim.includes(fallbackMsg)) ||
            (lowConfMsg && answerTrim.includes(lowConfMsg)) ||
            /لم\s*أجد\s*معلوم/i.test(answerTrim) ||
            /لا\s*توجد\s*معلوم/i.test(answerTrim) ||
            /^عذراً/.test(answerTrim);

          if (!isFailedAnswer) {
            try {
              const sourcesStr = finalSources.length > 0 ? finalSources.join("، ") : null;
              const ttlMinutes = parseInt(settings.cache_ttl_minutes) || 1440;
              const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
              const embStr = queryEmbedding ? `[${queryEmbedding.join(",")}]` : null;
              await supabase.from("response_cache").upsert({
                question_hash: questionHash, question: lastUserMessage,
                answer: cleanContent, sources: sourcesStr, expires_at: expiresAt,
                question_embedding: embStr,
              }, { onConflict: "question_hash" });
            } catch (e) {
              console.error("Cache save error:", e);
            }
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
