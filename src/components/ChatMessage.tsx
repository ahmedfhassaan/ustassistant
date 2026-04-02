import { BookOpen } from "lucide-react";
import type { Message } from "@/pages/Chat";

interface ChatMessageProps {
  message: Message;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] sm:max-w-[70%] ${isUser ? "chat-bubble-user" : "chat-bubble-assistant"}`}>
        <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
        {message.source && (
          <div className="mt-2 pt-2 border-t border-foreground/10 flex items-center gap-1.5 text-xs opacity-70">
            <BookOpen className="w-3 h-3" />
            <span>المصدر: {message.source}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
