import { supabase } from "@/integrations/supabase/client";
import type { Conversation, Message } from "@/pages/Chat";

const LOCAL_STORAGE_KEY = "chat_conversations";

export async function loadConversations(userId: string): Promise<Conversation[]> {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select("id, user_id, title, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Load messages for all conversations
    const convIds = data.map((c) => c.id);
    const { data: messagesData, error: msgError } = await supabase
      .from("conversation_messages")
      .select("id, conversation_id, role, content, source, question, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: true });

    if (msgError) throw msgError;

    const messagesByConv = new Map<string, Message[]>();
    for (const m of messagesData || []) {
      const list = messagesByConv.get(m.conversation_id) || [];
      list.push({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        source: m.source || undefined,
        question: m.question || undefined,
      });
      messagesByConv.set(m.conversation_id, list);
    }

    return data.map((c) => ({
      id: c.id,
      title: c.title,
      messages: messagesByConv.get(c.id) || [],
      createdAt: new Date(c.created_at),
    }));
  } catch (e) {
    console.error("Failed to load conversations:", e);
    return [];
  }
}

export async function saveNewConversation(
  userId: string,
  title: string,
  messages: Message[]
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: userId, title })
      .select("id")
      .single();

    if (error) throw error;

    const convId = data.id;

    if (messages.length > 0) {
      const rows = messages.map((m) => ({
        conversation_id: convId,
        role: m.role,
        content: m.content,
        source: m.source || null,
        question: m.question || null,
      }));

      const { error: msgError } = await supabase
        .from("conversation_messages")
        .insert(rows);

      if (msgError) throw msgError;
    }

    return convId;
  } catch (e) {
    console.error("Failed to save conversation:", e);
    return null;
  }
}

export async function addMessagesToConversation(
  conversationId: string,
  messages: Message[]
): Promise<void> {
  try {
    const rows = messages.map((m) => ({
      conversation_id: conversationId,
      role: m.role,
      content: m.content,
      source: m.source || null,
      question: m.question || null,
    }));

    const { error } = await supabase
      .from("conversation_messages")
      .insert(rows);

    if (error) throw error;
  } catch (e) {
    console.error("Failed to add messages:", e);
  }
}

export async function deleteConversation(conversationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId);

    if (error) throw error;
  } catch (e) {
    console.error("Failed to delete conversation:", e);
  }
}

// Migrate localStorage data to database (one-time)
export async function migrateLocalConversations(userId: string): Promise<boolean> {
  const key = `${LOCAL_STORAGE_KEY}_${userId}`;
  const raw = localStorage.getItem(key);
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw) as any[];
    if (!parsed.length) return false;

    for (const conv of parsed) {
      const messages: Message[] = (conv.messages || []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        source: m.source,
        question: m.question,
      }));
      await saveNewConversation(userId, conv.title || "محادثة", messages);
    }

    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
