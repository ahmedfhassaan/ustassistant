import { Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import type { Conversation } from "@/pages/Chat";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (conv: Conversation) => void;
  onNewChat: () => void;
}

const ChatSidebar = ({ conversations, activeId, onSelect, onNewChat }: ChatSidebarProps) => {
  const { isDark } = useTheme();

  return (
    <aside className={`w-72 h-full border-l flex flex-col transition-colors duration-300 ${
      isDark ? "glass-sidebar" : "bg-sidebar border-border"
    }`}>
      <div className={`p-3 border-b ${isDark ? "border-white/6" : "border-border"}`}>
        <Button
          onClick={onNewChat}
          className={`w-full gap-2 transition-all duration-200 ${
            isDark
              ? "bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 glow-primary"
              : "bg-primary hover:bg-primary-hover text-primary-foreground"
          }`}
        >
          <Plus className="w-4 h-4" />
          محادثة جديدة
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            لا توجد محادثات سابقة
          </p>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={`w-full text-right px-3 py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 ${
                conv.id === activeId
                  ? isDark
                    ? "bg-primary/15 text-primary border border-primary/20 glow-primary"
                    : "bg-sidebar-accent text-sidebar-accent-foreground"
                  : isDark
                    ? "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <MessageSquare className={`w-4 h-4 shrink-0 ${conv.id === activeId && isDark ? "glow-icon" : "opacity-50"}`} />
              <span className="truncate">{conv.title}</span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
};

export default ChatSidebar;
