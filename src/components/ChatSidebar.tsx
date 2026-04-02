import { Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Conversation } from "@/pages/Chat";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (conv: Conversation) => void;
  onNewChat: () => void;
}

const ChatSidebar = ({ conversations, activeId, onSelect, onNewChat }: ChatSidebarProps) => {
  return (
    <aside className="w-72 h-full border-l bg-sidebar flex flex-col">
      <div className="p-3 border-b">
        <Button
          onClick={onNewChat}
          className="w-full gap-2 bg-primary hover:bg-primary-hover text-primary-foreground"
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
              className={`w-full text-right px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                conv.id === activeId
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0 opacity-50" />
              <span className="truncate">{conv.title}</span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
};

export default ChatSidebar;
