import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ChatSidebar from "@/components/ChatSidebar";
import ChatHeader from "@/components/ChatHeader";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ChatWelcome from "@/components/ChatWelcome";

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

  const student = JSON.parse(localStorage.getItem("student") || "null");

  useEffect(() => {
    if (!student) {
      navigate("/");
    }
  }, [student, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isWelcomeScreen = messages.length === 0;

  const handleSend = async (text: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    setTimeout(() => {
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "شكرًا على سؤالك! هذه نسخة تجريبية من المساعد الجامعي الذكي. سيتم ربط النظام بقاعدة المعرفة الجامعية قريبًا لتقديم إجابات دقيقة ومفصلة.",
        source: "النظام التجريبي",
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsLoading(false);

      if (!activeConversationId) {
        const newConv: Conversation = {
          id: Date.now().toString(),
          title: text.slice(0, 40) + (text.length > 40 ? "..." : ""),
          messages: [...newMessages, assistantMsg],
          createdAt: new Date(),
        };
        setConversations((prev) => [newConv, ...prev]);
        setActiveConversationId(newConv.id);
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversationId
              ? { ...c, messages: [...newMessages, assistantMsg] }
              : c
          )
        );
      }
    }, 1200);
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setSidebarOpen(false);
  };

  const handleSelectConversation = (conv: Conversation) => {
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
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-30 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
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

      {/* Main area */}
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
          /* Messages */
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
            <div className="max-w-3xl mx-auto space-y-5">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isLoading && (
                <div className="flex gap-3 animate-fade-in">
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

        {/* Input */}
        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default Chat;
