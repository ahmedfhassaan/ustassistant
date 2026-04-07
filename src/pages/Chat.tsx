import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import ChatSidebar from "@/components/ChatSidebar";
import ChatHeader from "@/components/ChatHeader";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ChatWelcome from "@/components/ChatWelcome";
import { streamChat } from "@/lib/chatApi";
import {
  loadConversations,
  saveNewConversation,
  addMessagesToConversation,
  migrateLocalConversations,
} from "@/lib/chatStorage";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: string;
  question?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

const Chat = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const student = JSON.parse(localStorage.getItem("student") || "null");

  useEffect(() => {
    if (!student) {
      navigate("/");
    }
  }, [student, navigate]);

  // Load conversations from database on mount
  useEffect(() => {
    if (!student?.id) return;
    const load = async () => {
      setIsLoadingConversations(true);
      // Migrate local data first (one-time)
      await migrateLocalConversations(student.id);
      const saved = await loadConversations(student.id);
      setConversations(saved);
      setIsLoadingConversations(false);
    };
    load();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isWelcomeScreen = messages.length === 0;

  const handleSend = async (text: string) => {
    if (isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    const apiMessages = newMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let assistantContent = "";
    const assistantId = (Date.now() + 1).toString();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat({
        messages: apiMessages,
        userId: student?.id,
        signal: controller.signal,
        onDelta: (chunk) => {
          assistantContent += chunk;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && last.id === assistantId) {
              return prev.map((m) =>
                m.id === assistantId ? { ...m, content: assistantContent } : m
              );
            }
            return [
              ...prev,
              { id: assistantId, role: "assistant", content: assistantContent },
            ];
          });
        },
        onDone: async (meta) => {
          setIsLoading(false);
          abortRef.current = null;

          let source = meta?.sources || undefined;
          let cleanContent = assistantContent;

          const sourceMatch = assistantContent.match(/\[المصادر:\s*([^\]]+)\]\s*$/);
          if (sourceMatch) {
            source = sourceMatch[1].trim();
            cleanContent = assistantContent.replace(sourceMatch[0], "").trim();
          }

          const assistantMsg: Message = {
            id: assistantId,
            role: "assistant",
            content: cleanContent,
            source,
            question: text,
          };

          const finalMessages: Message[] = [...newMessages, assistantMsg];
          setMessages(finalMessages);

          // Save to database
          if (!activeConversationId) {
            const title = text.slice(0, 40) + (text.length > 40 ? "..." : "");
            const convId = await saveNewConversation(student.id, title, finalMessages);
            if (convId) {
              const newConv: Conversation = {
                id: convId,
                title,
                messages: finalMessages,
                createdAt: new Date(),
              };
              setConversations((prev) => [newConv, ...prev]);
              setActiveConversationId(convId);
            }
          } else {
            // Add new messages (user + assistant) to existing conversation
            await addMessagesToConversation(activeConversationId, [userMsg, assistantMsg]);
            setConversations((prev) =>
              prev.map((c) =>
                c.id === activeConversationId ? { ...c, messages: finalMessages } : c
              )
            );
          }
        },
      });
    } catch (error: any) {
      if (error.name === "AbortError") return;
      setIsLoading(false);
      abortRef.current = null;
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
      setMessages(messages);
    }
  };

  const handleNewChat = () => {
    if (abortRef.current) abortRef.current.abort();
    setActiveConversationId(null);
    setMessages([]);
    setSidebarOpen(false);
  };

  const handleSelectConversation = (conv: Conversation) => {
    if (abortRef.current) abortRef.current.abort();
    setActiveConversationId(conv.id);
    setMessages(conv.messages);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("student");
    navigate("/");
  };

  if (!student) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-30 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed lg:static z-40 h-full transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        } right-0 lg:right-auto`}
      >
        <ChatSidebar
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={handleSelectConversation}
          onNewChat={handleNewChat}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 animate-fade-in">
        <ChatHeader
          studentName={student.name}
          onLogout={handleLogout}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {isLoadingConversations ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground text-sm">جارٍ تحميل المحادثات...</p>
            </div>
          </div>
        ) : isWelcomeScreen ? (
          <ChatWelcome
            studentName={student.name}
            onSuggestionClick={handleSend}
          />
        ) : (
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
            <div className="max-w-3xl mx-auto space-y-5">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3 animate-fade-in justify-start" dir="ltr">
                  <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-accent/20 text-accent-foreground mt-1">
                    <span className="w-4 h-4 text-xs">🤖</span>
                  </div>
                  <div className="chat-bubble-assistant flex items-center gap-1.5 py-4">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default Chat;
