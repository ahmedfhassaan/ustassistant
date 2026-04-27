import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت أداة إعادة صياغة استعلامات بحث جامعية.
مهمتك: تحويل سؤال الطالب إلى مجموعة من 5 إلى 10 كلمات مفتاحية بحثية باللغة العربية فقط.

قواعد صارمة:
- أعد فقط الكلمات المفتاحية مفصولة بمسافات. لا جمل، لا شرح، لا علامات ترقيم.
- ركّز على المصطلحات الجامعية الأكاديمية والإدارية ذات الصلة (تسجيل، مقررات، امتحانات، رسوم، خطة دراسية، انسحاب، اعتذار، ...).
- لا تخترع معلومات خارج موضوع السؤال.
- إذا كان السؤال خارج النطاق الجامعي تماماً، أعد السؤال الأصلي كما هو.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question } = await req.json();
    if (!question || typeof question !== "string" || !question.trim()) {
      return new Response(
        JSON.stringify({ error: "question is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      return new Response(
        JSON.stringify({ rewritten: question, fallback: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GOOGLE_AI_API_KEY}`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: question }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: { maxOutputTokens: 60, temperature: 0.1 },
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!r.ok) {
        return new Response(
          JSON.stringify({ rewritten: question, fallback: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await r.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      // Sanity guard: keep only short keyword strings
      if (!text || text.length < 3 || text.length > 200) {
        return new Response(
          JSON.stringify({ rewritten: question, fallback: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Strip surrounding quotes/punctuation
      const cleaned = text.replace(/^["'«»\s]+|["'«»\s\.\?!]+$/g, "").trim();
      return new Response(
        JSON.stringify({ rewritten: cleaned || question, fallback: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (e) {
      clearTimeout(timer);
      console.warn("[rewrite-query] failed:", e instanceof Error ? e.message : e);
      return new Response(
        JSON.stringify({ rewritten: question, fallback: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
