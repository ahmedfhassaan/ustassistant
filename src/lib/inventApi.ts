import { supabase } from "@/integrations/supabase/client";

interface ChatResponse {
  answer: string;
  source?: string | null;
}

export async function sendMessage(message: string, userId: string, conversationId?: string): Promise<ChatResponse> {
  const { data, error } = await supabase.functions.invoke("chat", {
    body: { message, user_id: userId, conversation_id: conversationId },
  });

  if (error) {
    console.error("Chat function error:", error);
    throw new Error("حدث خطأ في الاتصال بالمساعد الذكي. حاول مرة أخرى.");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return {
    answer: data?.answer || "لم يتم استلام رد.",
    source: data?.source || null,
  };
}
