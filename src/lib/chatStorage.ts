import type { Conversation, Message } from "@/pages/Chat";

const STORAGE_KEY = "chat_conversations";

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY}_${userId}`;
}

export function loadConversations(userId: string): Conversation[] {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((c: any) => ({
      ...c,
      createdAt: new Date(c.createdAt),
    }));
  } catch {
    return [];
  }
}

export function saveConversations(userId: string, conversations: Conversation[]): void {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(conversations));
  } catch (e) {
    console.error("Failed to save conversations:", e);
  }
}
