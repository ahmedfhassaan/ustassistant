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

    // Search knowledge base for relevant context
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user")?.content || "";
    let knowledgeContext = "";

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: chunks } = await supabase.rpc("search_knowledge", {
        query_text: lastUserMessage,
        max_results: 5,
      });

      if (chunks && chunks.length > 0) {
        knowledgeContext = "\n\n--- معلومات من قاعدة المعرفة الجامعية ---\n" +
          chunks.map((c: any) => `[${c.document_name}]: ${c.content}`).join("\n\n") +
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
- إذا وجدت معلومات من قاعدة المعرفة أدناه، استخدمها في إجابتك واذكر المصدر
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

    return new Response(response.body, {
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
