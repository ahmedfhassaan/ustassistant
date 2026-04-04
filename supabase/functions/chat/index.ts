import { corsHeaders } from "@supabase/supabase-js/cors";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const BodySchema = z.object({
  message: z.string().min(1).max(5000),
  user_id: z.string().min(1).max(100),
  conversation_id: z.string().optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "بيانات غير صالحة", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { message, user_id } = parsed.data;
    const INVENT_API_KEY = Deno.env.get("INVENT_API_KEY");
    if (!INVENT_API_KEY) {
      return new Response(
        JSON.stringify({ error: "مفتاح API غير مهيأ" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const inventResponse = await fetch("https://api.invent.ai/v1/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${INVENT_API_KEY}`,
      },
      body: JSON.stringify({
        action: "create_resource",
        version: "1.0",
        payload: {
          key_id: INVENT_API_KEY,
          parameters: {
            name: user_id,
            description: message,
            config: {
              priority: "high",
              sync_enabled: true,
            },
          },
        },
        metadata: {
          source: "lovable_app",
        },
      }),
    });

    if (!inventResponse.ok) {
      const errorText = await inventResponse.text();
      console.error("Invent API error:", inventResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "حدث خطأ في الاتصال بالمساعد الذكي" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const inventData = await inventResponse.json();

    // Extract answer from Invent response - adjust based on actual API response structure
    const answer = inventData?.data?.status === "active"
      ? `تم معالجة طلبك بنجاح. معرف الطلب: ${inventData?.data?.id || "غير متوفر"}`
      : inventData?.data?.answer || inventData?.data?.response || inventData?.data?.message || "تم استلام ردك بنجاح.";

    const source = inventData?.data?.source || null;

    return new Response(
      JSON.stringify({ answer, source }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
