import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت أداة توسيع استعلامات بحث جامعية متعددة الصيغ.
مهمتك: تحويل سؤال الطالب إلى **3 صيغ بحث مختلفة** باللغة العربية، مفصولة بالرمز |

الصيغ الثلاث المطلوبة (بهذا الترتيب الحرفي):
1. **صيغة الكلمات الأساسية**: 4-7 كلمات مفتاحية مباشرة من السؤال (بدون أحرف جر أو أدوات استفهام).
2. **صيغة موسّعة بالسياق**: نفس الكلمات + كلمات سياقية محتمل ارتباطها (الفرع، الموعد، الشروط، الرسوم، المتطلبات، البدائل) — اختر فقط ما يناسب نوع السؤال.
3. **صيغة بزاوية بديلة**: صياغة نفس السؤال بمرادفات وكلمات أكاديمية مختلفة (مثلاً: "تخصصات" → "أقسام كليات برامج"، "موعد" → "تاريخ بداية جدول").

قواعد صارمة:
- أعد **3 صيغ فقط** مفصولة بالرمز | (شرطة عمودية).
- كل صيغة 4-10 كلمات.
- لا جمل كاملة، لا شرح، لا علامات ترقيم، لا أرقام تعداد.
- لا تخترع معلومات؛ ابقَ ضمن موضوع السؤال.
- إذا كان السؤال خارج النطاق الجامعي تماماً، أعد السؤال الأصلي ثلاث مرات مفصولاً بـ |

مثال:
سؤال: "ما تخصصات قسم الحاسبات؟"
الناتج: تخصصات قسم الحاسبات | تخصصات قسم الحاسبات فرع تعز صنعاء كلية | أقسام برامج هندسة الحاسوب تقنية معلومات`;

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
        JSON.stringify({ rewritten: question, variants: [question], fallback: true }),
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
          generationConfig: { maxOutputTokens: 150, temperature: 0.2 },
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!r.ok) {
        return new Response(
          JSON.stringify({ rewritten: question, variants: [question], fallback: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await r.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!text || text.length < 3 || text.length > 500) {
        return new Response(
          JSON.stringify({ rewritten: question, variants: [question], fallback: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Parse pipe-separated variants
      const variants = text
        .split("|")
        .map((v: string) => v.replace(/^["'«»\s\-\d\.\)]+|["'«»\s\.\?!]+$/g, "").trim())
        .filter((v: string) => v.length >= 3 && v.length <= 200)
        .slice(0, 3);

      const finalVariants = variants.length > 0 ? variants : [question];
      return new Response(
        JSON.stringify({
          rewritten: finalVariants[0] || question,
          variants: finalVariants,
          fallback: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (e) {
      clearTimeout(timer);
      console.warn("[rewrite-query] failed:", e instanceof Error ? e.message : e);
      return new Response(
        JSON.stringify({ rewritten: question, variants: [question], fallback: true }),
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
