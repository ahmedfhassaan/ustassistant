import { LogOut, Menu, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useSettings } from "@/hooks/use-settings";
import universityLogo from "@/assets/university-logo.png";
import universityLogoDark from "@/assets/university-logo-dark.jpeg";

interface ChatHeaderProps {
  studentName: string;
  onLogout: () => void;
  onMenuClick: () => void;
}

const ChatHeader = ({ studentName, onLogout, onMenuClick }: ChatHeaderProps) => {
  const { isDark, toggle } = useTheme();
  const { settings } = useSettings();

  return (
    <header className={`h-14 border-b flex items-center justify-between px-4 shrink-0 transition-colors duration-300 animate-slide-in-left ${
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
        <div className="relative h-10 w-[120px] shrink-0">
          <img
            src={universityLogo}
            alt="شعار جامعة العلوم والتكنولوجيا"
            className={`absolute inset-0 h-10 w-auto object-contain transition-opacity duration-200 ${isDark ? "opacity-0" : "opacity-100"}`}
          />
          <img
            src={universityLogoDark}
            alt="شعار جامعة العلوم والتكنولوجيا"
            className={`absolute inset-0 h-10 w-auto object-contain transition-opacity duration-200 ${isDark ? "opacity-100 drop-shadow-[0_0_6px_rgba(112,200,255,0.15)]" : "opacity-0"}`}
          />
        </div>
        <span className={`font-bold text-base hidden sm:inline ${isDark ? "text-foreground glow-text" : "text-foreground"}`}>
          {settings.assistant_name}
        </span>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          {isDark ? <Sun className="w-4 h-4 text-[hsl(var(--highlight))]" /> : <Moon className="w-4 h-4" />}
        </Button>
        <span className="text-sm text-muted-foreground hidden sm:inline truncate max-w-[140px]">{studentName}</span>
        <Button variant="ghost" size="icon" onClick={onLogout} title="تسجيل الخروج" className="shrink-0">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
};

export default ChatHeader;
