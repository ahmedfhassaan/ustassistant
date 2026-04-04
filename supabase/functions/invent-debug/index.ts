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

    // Try to get orgs
    const orgsRes = await fetch("https://api.useinvent.com/orgs", {
      headers: { "Authorization": `Bearer ${INVENT_API_KEY}` },
    });
    const orgsData = await orgsRes.text();

    // Try /me
    const meRes = await fetch("https://api.useinvent.com/user", {
      headers: { "Authorization": `Bearer ${INVENT_API_KEY}` },
    });
    const meData = await meRes.text();

    return new Response(
      JSON.stringify({ orgs: orgsData, me: meData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
