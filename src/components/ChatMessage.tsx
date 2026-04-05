import { useState } from "react";
import { BookOpen, Bot, User, ThumbsUp, ThumbsDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Message } from "@/pages/Chat";

interface ChatMessageProps {
  message: Message;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFeedback = async (isHelpful: boolean) => {
    if (feedback !== null || submitting) return;
    setSubmitting(true);
    try {
      const student = JSON.parse(localStorage.getItem("student") || "null");
      const { error } = await supabase.from("message_feedback" as any).insert({
        user_id: student?.id || null,
        message_content: message.content.slice(0, 500),
        is_helpful: isHelpful,
      } as any);
      if (error) throw error;
      setFeedback(isHelpful);
    } catch {
      toast({ title: "خطأ", description: "فشل إرسال التقييم", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? "flex-row" : "flex-row-reverse"}`} dir="rtl">
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
      <div className={`max-w-[80%] sm:max-w-[70%]`}>
        <div
          className={`group relative transition-all duration-200 ${
            isUser ? "chat-bubble-user" : "chat-bubble-assistant"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm leading-7 text-right">{message.content}</p>
          ) : (
            <div className="prose prose-sm prose-chat max-w-none text-sm leading-7" dir="rtl">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
          {message.source && (
            <div className="mt-2.5 pt-2 border-t border-foreground/10 flex items-center gap-1.5 text-xs opacity-60 flex-row-reverse justify-end">
              <BookOpen className="w-3 h-3" />
              <span>المصدر: {message.source}</span>
            </div>
          )}
        </div>

        {/* Feedback buttons for assistant messages */}
        {!isUser && message.content && (
          <div className="flex items-center gap-2 mt-1.5 mr-1" dir="rtl">
            {feedback === null ? (
              <>
                <button
                  onClick={() => handleFeedback(true)}
                  disabled={submitting}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-emerald-500 transition-colors duration-200 px-2 py-1 rounded-md hover:bg-emerald-500/10"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>مفيد</span>
                </button>
                <button
                  onClick={() => handleFeedback(false)}
                  disabled={submitting}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors duration-200 px-2 py-1 rounded-md hover:bg-red-500/10"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span>غير مفيد</span>
                </button>
              </>
            ) : (
              <span className={`text-xs flex items-center gap-1 px-2 py-1 rounded-md ${
                feedback ? "text-emerald-500 bg-emerald-500/10" : "text-red-500 bg-red-500/10"
              }`}>
                {feedback ? <ThumbsUp className="w-3.5 h-3.5" /> : <ThumbsDown className="w-3.5 h-3.5" />}
                {feedback ? "شكراً لتقييمك!" : "شكراً، سنعمل على التحسين"}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
