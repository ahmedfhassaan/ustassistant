const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const INVENT_API_KEY = Deno.env.get("INVENT_API_KEY");
    if (!INVENT_API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Record<string, string> = {};

    const endpoints = [
      "/assistants",
      "/chats",
    ];

    for (const ep of endpoints) {
      try {
        const res = await fetch(`https://api.useinvent.com${ep}`, {
          headers: { "Authorization": `Bearer ${INVENT_API_KEY}` },
        });
        results[ep] = await res.text();
      } catch (e) {
        results[ep] = String(e);
      }
    }

    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
