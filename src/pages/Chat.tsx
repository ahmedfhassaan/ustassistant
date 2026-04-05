import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import ChatSidebar from "@/components/ChatSidebar";
import ChatHeader from "@/components/ChatHeader";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ChatWelcome from "@/components/ChatWelcome";
import { streamChat } from "@/lib/chatApi";
import { loadConversations, saveConversations } from "@/lib/chatStorage";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: string;
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const student = JSON.parse(localStorage.getItem("student") || "null");

  useEffect(() => {
    if (!student) {
      navigate("/");
    }
  }, [student, navigate]);

  // Load saved conversations on mount
  useEffect(() => {
    if (student?.id) {
      const saved = loadConversations(student.id);
      setConversations(saved);
    }
  }, []);

  // Save conversations whenever they change
  useEffect(() => {
    if (student?.id && conversations.length > 0) {
      saveConversations(student.id, conversations);
    }
  }, [conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isWelcomeScreen = messages.length === 0;

  const updateConversations = useCallback((updatedMessages: Message[], text: string) => {
    if (!activeConversationId) {
      const newConv: Conversation = {
        id: Date.now().toString(),
        title: text.slice(0, 40) + (text.length > 40 ? "..." : ""),
        messages: updatedMessages,
        createdAt: new Date(),
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
    } else {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, messages: updatedMessages }
            : c
        )
      );
    }
  }, [activeConversationId]);

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

    // Prepare messages for API (only role and content)
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
        onDone: (meta) => {
          setIsLoading(false);
          abortRef.current = null;
          
          // Extract sources from response content or meta
          let source = meta?.sources || undefined;
          let cleanContent = assistantContent;
          
          // Try to extract [المصادر: ...] from the end of the response
          const sourceMatch = assistantContent.match(/\[المصادر:\s*([^\]]+)\]\s*$/);
          if (sourceMatch) {
            source = sourceMatch[1].trim();
            cleanContent = assistantContent.replace(sourceMatch[0], "").trim();
          }
          
          const finalMessages: Message[] = [
            ...newMessages,
            { id: assistantId, role: "assistant", content: cleanContent, source },
          ];
          
          // Update displayed message with clean content and source
          setMessages(finalMessages);
          updateConversations(finalMessages, text);
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
      // Remove the user message on error
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

        {isWelcomeScreen ? (
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
