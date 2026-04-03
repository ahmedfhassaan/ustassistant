import { LogOut, Menu, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import universityLogo from "@/assets/university-logo.png";

interface ChatHeaderProps {
  studentName: string;
  onLogout: () => void;
  onMenuClick: () => void;
}

const ChatHeader = ({ studentName, onLogout, onMenuClick }: ChatHeaderProps) => {
  const { isDark, toggle } = useTheme();

  return (
    <header className={`h-14 border-b flex items-center justify-between px-4 shrink-0 transition-all duration-300 animate-slide-in-left ${
      isDark ? "glass-header border-transparent" : "bg-background border-border"
    }`}>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <img src={universityLogo} alt="شعار الجامعة" className={`h-9 w-auto ${isDark ? "brightness-125 drop-shadow-[0_0_3px_rgba(112,200,255,0.2)]" : ""}`} />
        <span className={`font-bold text-base hidden sm:inline ${isDark ? "text-foreground glow-text" : "text-foreground"}`}>
          المساعد الجامعي الذكي
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4 text-[hsl(var(--highlight))]" /> : <Moon className="w-4 h-4" />}
        </Button>
        <span className="text-sm text-muted-foreground">{studentName}</span>
        <Button variant="ghost" size="icon" onClick={onLogout} title="تسجيل الخروج">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
};

export default ChatHeader;
