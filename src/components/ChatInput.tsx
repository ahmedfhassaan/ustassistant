import { useState, useRef } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
}

const ChatInput = ({ onSend, isLoading }: ChatInputProps) => {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!text.trim() || isLoading) return;
    onSend(text.trim());
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 150) + "px";
    }
  };

  return (
    <div className="border-t bg-background p-3 sm:p-4 shrink-0">
      <div className="max-w-3xl mx-auto flex items-end gap-2 bg-secondary rounded-2xl px-3 py-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="اكتب سؤالك هنا..."
          rows={1}
          dir="rtl"
          className="flex-1 bg-transparent resize-none outline-none text-sm leading-6 max-h-[150px] py-1 text-foreground placeholder:text-muted-foreground"
        />
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!text.trim() || isLoading}
          className="shrink-0 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground h-9 w-9"
        >
          <Send className="w-4 h-4 rotate-180" />
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;
