import { BookOpen, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Message } from "@/pages/Chat";

interface ChatMessageProps {
  message: Message;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 transition-all duration-200 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-accent/20 text-accent-foreground dark:glow-icon"
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] sm:max-w-[70%] group relative transition-all duration-200 ${
          isUser ? "chat-bubble-user" : "chat-bubble-assistant"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
        ) : (
          <div className="prose prose-sm prose-chat max-w-none text-sm leading-7" dir="rtl">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        {message.source && (
          <div className="mt-2.5 pt-2 border-t border-foreground/10 flex items-center gap-1.5 text-xs opacity-60">
            <BookOpen className="w-3 h-3" />
            <span>المصدر: {message.source}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
