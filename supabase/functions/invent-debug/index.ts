const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ORG_ID = "org_7wHuTTRIfOM537zxuAHi6g";
const ASSISTANT_ID = "ast_3KBrzrQtmz96OiN97iIztc";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const INVENT_API_KEY = Deno.env.get("INVENT_API_KEY");
    if (!INVENT_API_KEY) {
      return new Response(JSON.stringify({ error: "No API key" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 1: Create a new chat with the assistant
    const createChatRes = await fetch(`https://api.useinvent.com/orgs/${ORG_ID}/assistants/${ASSISTANT_ID}/chats`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${INVENT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: [{ type: "text", text: "مرحبا، ما هي ساعات العمل؟" }],
      }),
    });
    const createChatData = await createChatRes.text();

    // Step 2: Also try creating message on existing chat pattern
    // POST /chats/{chat_id}/messages
    
    return new Response(
      JSON.stringify({ 
        createChat: { status: createChatRes.status, body: createChatData }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
